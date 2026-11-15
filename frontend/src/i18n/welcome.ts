// Copy for the signed-out welcome page. Only Chinese ships for now because
// card content (hints and translations) is Chinese-only; add `en` once English
// card content is available.

export interface DemoCardCopy {
    template: string;
    word: string;
    reading: string;
    hint: string;
    translation: string;
    fromLevel: number;
    toLevel: number;
    nextReview: string;
}

export interface WelcomeCopy {
    badge: string;
    titleLead: string;
    titleAccent: string;
    subtitle: string;
    signIn: string;
    signInNote: string;
    demoLabel: string;
    demoAria: string;
    demoNextReview: (interval: string) => string;
    demoCards: DemoCardCopy[];
    stepsTitle: string;
    steps: { title: string; body: string }[];
    srsEyebrow: string;
    srsTitle: string;
    srsBody: string;
    stages: { name: string; interval: string }[];
    decksTitle: string;
    decksSummary: (words: string) => string;
    deckUnit: (count: string, grammar: boolean) => string;
    difficulty: Record<string, string>;
    grammarSuffix: string;
    ctaTitle: string;
    ctaBody: string;
    footerOrigin: string;
    footerCreditPrefix: string;
    footerCreditSuffix: string;
}

// Level transitions and intervals follow backend/dabia/core/srs_constants.py.
export const zh: WelcomeCopy = {
    badge: '日语单词 · JLPT N5 到 N1',
    titleLead: '忘记之前，',
    titleAccent: '再见一次。',
    subtitle: 'Dabia 用真实例句教你日语单词，记下你对每个词的掌握程度，在恰当的时间安排复习。',
    signIn: '使用 Google 登录',
    signInNote: '免费使用，登录后马上开始第一张卡。',
    demoLabel: '示例',
    demoAria: '词卡示例',
    demoNextReview: (interval) => `答对了 · ${interval}后再复习`,
    demoCards: [
        {
            template: '毎朝、__を飲みます。',
            word: 'コーヒー',
            reading: 'コーヒー',
            hint: '咖啡',
            translation: '每天早上喝咖啡。',
            fromLevel: 3,
            toLevel: 4,
            nextReview: '7 天',
        },
        {
            template: '電車が__しています。',
            word: '遅延',
            reading: 'ちえん',
            hint: '延迟，晚点',
            translation: '电车晚点了。',
            fromLevel: 2,
            toLevel: 3,
            nextReview: '5 分钟',
        },
        {
            template: '週末は友達と__を見ます。',
            word: '映画',
            reading: 'えいが',
            hint: '电影',
            translation: '周末和朋友一起看电影。',
            fromLevel: 4,
            toLevel: 5,
            nextReview: '30 天',
        },
    ],
    stepsTitle: '一个单词是怎么记住的',
    steps: [
        { title: '在例句里认识它', body: '每个单词都配有自然的日语例句、中文释义和例句音频。' },
        { title: '打字把它想起来', body: '看着释义把空填上。自己回想再打出来，比看一眼答案记得牢。' },
        { title: '按时再见到它', body: 'Dabia 根据你的答题情况安排下一次复习，间隔从几分钟到一个月。' },
    ],
    srsEyebrow: '间隔重复',
    srsTitle: '五个阶段，从初次见面到长期记忆',
    srsBody: '答对一次，单词升一级，下次复习的间隔也随之拉长。答错了，几分钟内它就会回来让你再试。',
    stages: [
        { name: '新词', interval: '第一次见' },
        { name: '生疏', interval: '90 秒后再来' },
        { name: '学习中', interval: '5 分钟后再来' },
        { name: '熟悉', interval: '7 天后复习' },
        { name: '掌握', interval: '30 天后复习' },
    ],
    decksTitle: '选择你的级别',
    decksSummary: (words) => `共 ${words} 个单词，覆盖 JLPT 各级`,
    deckUnit: (count, grammar) => (grammar ? `${count} 条语法` : `${count} 词`),
    difficulty: { Beginner: '入门', Intermediate: '中级', Advanced: '中高级', Expert: '高级' },
    grammarSuffix: '语法',
    ctaTitle: '每天几分钟就够了',
    ctaBody: '用 Google 登录后，学习进度自动保存，换一台设备也能接着学。',
    footerOrigin: 'Dabia 这个名字是一个三岁小朋友起的。',
    footerCreditPrefix: '词汇数据来自 ',
    footerCreditSuffix: '（CC BY-NC 4.0）',
};
