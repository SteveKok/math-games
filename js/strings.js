/*
 * 界面文字。加新语言：在下面加一个同样结构的对象，再到 core.js 的 MG.LANGS 里把 enabled 设为 true。
 * 缺的 key 会自动回落到英文，再回落到中文。
 * 每个游戏自己的文字也放在这里，按游戏分段。
 */
window.MG = window.MG || {};
window.MG.STRINGS = {
  zh: {
    siteTitle: '思维小游戏',
    siteSub: '先玩，先试，自己发现秘诀',
    play: '开始玩',
    comingSoon: '快做好了',
    noGamesYet: '新游戏正在路上……',
    footer: '免费 · 开源 · 不收集任何信息',
    langNext: '切换语言',
    sound: '声音开关',
    home: '回首页',
    levels: '选关',
    level: '第 {n} 关',
    skin: '换个样子',
    youWin: '你赢了！',
    tryAgain: '没关系，再来一次！',
    again: '再玩一次',
    nextLevel: '下一关',
    hint: '给我一点提示',
    mathTitle: '这个游戏背后的数学',
    rules: '游戏规则',
    rulesTitle: '怎么玩？',
    rulesOk: '知道了！',
    close: '关闭'
  },

  en: {
    siteTitle: 'Think & Play',
    siteSub: 'Play first, try things, discover the secret yourself',
    play: 'Play',
    comingSoon: 'Coming soon',
    noGamesYet: 'New games are on the way…',
    footer: 'Free · Open source · Collects no data',
    langNext: 'Switch language',
    sound: 'Sound on/off',
    home: 'Home',
    levels: 'Levels',
    level: 'Level {n}',
    skin: 'Change look',
    youWin: 'You win!',
    tryAgain: 'No problem — try again!',
    again: 'Play again',
    nextLevel: 'Next level',
    hint: 'Give me a hint',
    mathTitle: 'The maths behind this game',
    rules: 'How to play',
    rulesTitle: 'How to play',
    rulesOk: 'Got it!',
    close: 'Close'
  },

  // 马来文：结构已预留，翻译完成后把 core.js 里 ms 的 enabled 改成 true。
  ms: {
    siteTitle: 'Main & Fikir',
    play: 'Main',
    youWin: 'Kamu menang!',
    again: 'Main lagi'
  }
};
