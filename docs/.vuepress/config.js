module.exports = {
  lang: 'en-US',
  title: "Leo-Shaoqiang's blog",
  description: 'Just Do it',
  repo: 'https://github.com/Leo-Shaoqiang',
  markdown: {},
  themeConfig: {
    logo: 'https://vuejs.org/images/logo.png',
    docsDir: 'docs',
    lastUpdated: 'Last Updated',
    displayAllHeaders: true,
    editLinks: true,
    editLinkText: '在 GitHub 上编辑此页 ！',
    nav: [
      { text: 'Home', link: '/me' },
      {
        text: '🔥 视频课程',
        link: 'https://ke.segmentfault.com/course/1650000023864436'
      },
      {
        text: 'Vue技术揭秘',
        link: 'https://ustbhuangyi.github.io/vue-analysis/'
      }
    ],
    sidebar: [
      // SidebarItem
      {
        text: 'React',
        link: '/react/',
        children: [
          // SidebarItem
          {
            text: 'redux',
            link: '/react/redux/redux.md',
            children: []
          }
        ]
      },
      {
        text: 'Browser',
        link: '/browser/browserRender/browser.md',
        children: []
      }
    ]

    // 为以下路由添加侧边栏
    // sidebar: [
    //   {
    //     text: 'React',
    //     children: [
    //       {
    //         text: 'Redux',
    //         link: '/react/redux'
    //       }
    //     ]
    //   },
    //   {
    //     text: 'JavaScript',
    //     children: [
    //       {
    //         text: 'JavaScript 查漏补缺'
    //       }
    //     ]
    //   },
    //   {
    //     text: '浏览器',
    //     children: ['浏览器相关']
    //   }
    // ]
  }
}
