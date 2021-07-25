# 前言

近日，出于对 Redux 的好奇和想对自己用过的东西知根知底之目的，做了一个 Redux 的自我检测，以便彻底了解其精髓之处。下面我会对使用 Redux 之后产生的疑问做一个清单，用问题导向往下深挖。

## 问题清单

---

1. state 初始化如何让全局都能访问到？
2. dispatch 之后，Redux 是如何去处理的？
3. reducer 是如何处理的？
4. state 中的数据被修改之后，订阅者们如何去收到更新后的数据？
5. 为什么 redux 的精髓在 combineReducer 和 middleware？
6. applyMiddleware 中为什么一个临时变量 dispatch 被赋值了 2 次？
7. applyMiddleware 中 middlewareAPI 的 dispatch 为什么要用匿名函数包裹？
8. React 发送了 dispatch 之后，如何感知 state 的改变？
9. hook 的出现是否会影响 Redux 的使用？

---

## Redux 源码目录简介

Redux 暴露出来的五个接口：

- createStore （会创建一个 store 及其相应的 dispatch 和 subscribe 操作）
- combineReducers (合并多个 reducer 为一个总的 reducer)
- bindActionCreators (返回包裹 dispatch 的函数可以直接使用。 一般用在 mapDispatchToProps 里)
- applyMiddleware (提供中间件，如 redux-thunk、redux-logger)
- compose (combineReducers 中会用到的工具函数)

我们将通过上述接口来一一解答我们提出的问题。ps：以下源码均是简化之后的代码

```
dispatch 之后，Redux 是如何去处理的？
state 中的数据被修改之后，页面如何去收到更新后的数据？
```

这些答案在 createStore.js 中，先来看看代码结构：

```
createStore(reducer, preloadedState, enhancer) {
  // 转换参数
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }
  let currentReducer = reducer // 当前的reducer，支持通过 store.replaceReducer 方式动态替换 reducer，为代码热替换提供可能。（之后会写一篇 react-redux 的文章来解读）
  let currentState = preloadedState // 当前的state
  let currentListeners = [] // 存储更新函数的数组
  let nextListeners = currentListeners // 下次dispatch将会触发的更新函数数组
  let isDispatching = false //类似一把锁，如果正在dispatch action，那么就做一些限制

  function getState() {
    // 返回当前的state， 可以调用store.getState()获取到store中的数据，
    ...
  }

  function subscribe(listener) {
    // 订阅一个更新函数（listener），实际上的订阅操作就是把listener放入一个listeners数组
    // 该方法会返回一个 unSubscribe() 函数，以便从数组中删除该监听函数。
    // 但是注意，这两个操作都是在dispatch不执行时候进行的。因为dispatch执行时候会循环执行更新函数，要保证listeners数组在这时候不能被改变
    ...
  }

  function dispatch(action) {
    // 接收action，调用reducer根据action和当前的state，返回一个新的state
    // 循环调用listeners数组，执行更新函数，函数内部会通过store.getState()获取state，此时的state为最新的state，完成页面的更新
    ...
  }

  return {
    dispatch,
    subscribe,
    getState,
  }

}
```

我们知道页面可以通过 store.getState() 去获取当前的最新状态，而页面如果修改了数据会发送一个 dispatch(type) ，而这个操作便是问题的关键：

```
function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }
    // 正在dispatch的话不能再次dispatch，也就是说不可以同时dispatch两个action
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      // 获取到当前的state
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }
// 此处的会将 subscribe() 里订阅的监听依次跑一遍，数组里面都是需要获取数据的函数。
    const listeners = (currentListeners = nextListeners)

// 循环执行当前的linstener
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      // 此处并没有将最新状态作为参数传递的原因是因为在监听器中，我们会直接调用 store.getState() 方法去拿到最新的状态，此处只是起到通知作用。这也是数据被更改之后，页面收到通知而去更新数据的方式。
      listener()
    }
    return action
  }
```

解答以上问题：

Q: dispatch 之后，Redux 是如何去处理的？state 中的数据被修改之后，页面如何去收到更新后的数据？

A: 首先会利用当前的 reducer、state 以及传入的参数 action 得到新的 state， 然后通过触发监听数组中的函数，让函数中的使用的 store.getState() 再次触发，起到通知数据更新的作用。

基本上 createStore.js 讲完了，接下来看一下 combineReducers.js 来解决以下问题：

```
reducer 是如何处理的？
```

```
// 获取到所有reducer的名字，组成数组
const reducerKeys = Object.keys(reducers)
// 最终合成的 reducers 集合
const finalReducers = {}
 // 遍历所有的 reducer 使 finalReducers 变成 key( reducer 名字) ： value( reducer 执行函数)的对象。
for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
   const finalReducerKeys = Object.keys(finalReducers)

// 该函数为 combineReducers.js 核心，主要思路是对传入的 reducer 进行对比，如果任何一个 reducer 返回的 state 与之前的 state 不同，则会返回全新的 state 。(其实这里有个疑问，该函数如果只改了一个 reducer 的 state 数据，都会返回一个全新的 state，为什么会这样处理？)
return function combination (state ={}, action){
    let hasChanged = false
    const nextState ={}
    for (let i =0; i < finalReducerKeys.length; i++) {
        const key = finalReducerKeys[i]
        const reducer = finalReducers[key]
        // 获取每个 reducer 的旧 state
        const previousStateForKey = state[key]
        // 根据旧 state 推出新的 state (纯函数的优势：相同的 state 和 action 返回的新 state 也会是不变的。)
        const nextStateForKey = reducer(previousStateForKey, action)
        if (typeof nextStateForKey ==='undefined') {
            const errorMessage = getUndefinedStateErrorMessage(key, action)
            throw newError(errorMessage)
        }
        // 最后一步 判断是否和之前的 state 是否一致。
        nextState[key]= nextStateForKey
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey
 }
    return hasChanged ? nextState : state
}
```

前面的都比较容易理解，相对比较绕的就是 applyMiddleware.js,阅读前需了解[柯理化](https://zhuanlan.zhihu.com/p/50247174) 和 node 中间件相关知识, 简单来说就是把一个带有多个参数的函数转换成一系列的嵌套函数。它返回一个新函数，这个新函数期望传入下一个参数。解读 applyMiddleware.js 来回答以下问题：

```
为什么一个临时变量 dispatch 被赋值了 2 次？
middlewareAPI 的 dispatch 为什么要用匿名函数包裹？
```

接下来我们逐一分析源码：

```
function applyMiddleware(...middlewares) {
  return (createStore) =>
      (reducer, preloadedState) => {
        const store = createStore(reducer, preloadedState)

        let dispatch = () => {
          throw new Error(
              'Dispatching while constructing your middleware is not allowed. ' +
              'Other middleware would not be applied to this dispatch.'
          )
        }

        const middlewareAPI = {
          getState: store.getState,
          dispatch: (action, ...args) => dispatch(action, ...args)
        }
        const chain = middlewares.map(middleware => middleware(middlewareAPI))

        dispatch = compose(...chain)(store.dispatch)

        return {
          ...store,
          dispatch
        }
      }
}
```

可以看到整体构造传入中间件(middlewares),内部函数返回正常的 store 和改造过后的 dispatch。而改造过后的 dispatch 是由 compose(...chain)(store.dispatch) 生成的，首先 compose(...chain) 来自于暴露的第五个接口 compose.js ,它其实就是我们所谓的柯理化处理函数，而 chain 则是一个类似下面的数组形式：

```
    next => action => {
        return next(action)
    }
```

compose(...chain) 只是将数组中的函数拼接起来，并未执行。且 compose 最后返回的仍然是一个层层包裹的函数。如下：

```
const composedFunc = (next3) => {
  return
  ((next2) => {
        return func1(func2(next2))
    })(func3(next3))
}
```

而真正执行的时候就是在传入这个 dispatch 参数时 compose(...chain)(dispatch)，这个 dispatch 正是上面的 next3，next2 就是 func3(next3) 的返回值，依次类推，得到如下：

```
func1(func2(func3(dispatch)));
```

```const realDispatch = (action) => {
  console.log("coreFun1 run");
  ((action) => {
    console.log("coreFunc2 run");
    ((action) => {
      console.log("coreFunc3 run");
      dispatch(action);
    })(action);
  })(action);
}

```

根据 node 中间件洋葱模型来看，所有的中间件处理了 action 之后 会往里传递，然后最后在最内层触发 dispatch 之后在将其结果作为参数往外传，最终得到一个全新的函数。

再顺着源码往上看，

```
const store = createStore(reducer, preloadedState)

        let dispatch = () => {
          throw new Error(
              'Dispatching while constructing your middleware is not allowed. ' +
              'Other middleware would not be applied to this dispatch.'
          )
        } // 第一次赋值

        const middlewareAPI = {
          getState: store.getState,
          dispatch: (action, ...args) => dispatch(action, ...args)
        }
const chain = middlewares.map(middleware => middleware(middlewareAPI))
dispatch = compose(...chain)(store.dispatch) // 第二次赋值
```

这段也主要是为了给每个 middleware 基本的 getState 和 dispatch。
解决几个常问到的疑点：

1. 为什么一个临时变量 dispatch 被赋值了 2 次？
   首先从第一个变量返回的 throw Error 可以看出这段代码希望在 middleware 数组被构建时， dispatch 不应该被调用，否则抛错。而在 middlewareAPI 的 dispatch 中被调用了一次但没触发这个 throw Error，是因为其实直到给 dispatch 第二次赋值时才真正调用 dispatch（我们之前解读到直到 compose 函数传入了(store.dispatch) 之后才会触发调用），所以这时 middlewareAPI 的 dispatch 并不会触发。
2. middlewareAPI 的 dispatch 为什么要用匿名函数包裹？
   目的就是如果每个 middleware 对 dispatch 有所改变，middleware 里面的 dispatch 也会相应做出改变（如一问中所说，compose(...chain)(store.dispatch) 触发了 middlewareAPI 的 dispatch 被调用）。

至此解决完 applyMiddleware 的相关问题，redux 的解析也到此结束，如有疑问或者解读错误的地方，还望大佬们指正。

参考链接：
[读源码理解 Redux Middleware 中间件 - FreewheelLee 的文章](https://zhuanlan.zhihu.com/p/304688473)
[redux 中间件的原理——从懵逼到恍然大悟 - Dell Lee 的文章](https://zhuanlan.zhihu.com/p/34651008)
[简单梳理 Redux 的源码与运行机制 - Nero 的文章](https://zhuanlan.zhihu.com/p/74279078)
