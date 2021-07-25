import { defineUserConfig } from 'vuepress'
import { DefaultThemeOptions } from 'vuepress'

export default defineUserConfig<DefaultThemeOptions>({
  lang: 'en-US',
  title: "Leo-Shaoqiang's blog",
  description: 'Just Do it',
  repo: 'https://github.com/Leo-Shaoqiang',

  themeConfig: {
    logo: 'https://vuejs.org/images/logo.png',
    nav: require('./nav'),
    sidebar: require('./sidebar'),
    sidebarDepth: 2,
    lastUpdated: 'Last Updated',
    searchMaxSuggestoins: 10,
    serviceWorker: {
      updatePopup: {
        message: 'New content is available.',
        buttonText: 'Refresh'
      }
    },
    editLinks: true,
    editLinkText: '在 GitHub 上编辑此页 ！'

    // 为以下路由添加侧边栏
    // sidebar: {
    //   '/React/': ['one', 'two']
    // }
  }
})
