/* ===== 小小工程师 - 学习内容数据整合 ===== */

(function() {
    var SUBJECTS = {
        chinese: { id: 'chinese', name: '语文', emoji: '📖', desc: '识字、拼音、课文', color: 'chinese' },
        math: { id: 'math', name: '数学', emoji: '🔢', desc: '数字、运算、几何', color: 'math' },
        english: { id: 'english', name: '英语', emoji: '🅰️', desc: '字母、单词、句型', color: 'english' }
    };

    var UNITS = {};

    for (var grade = 1; grade <= 6; grade++) {
        var chineseData = window.CHINESE_DATA && window.CHINESE_DATA[grade] ? window.CHINESE_DATA[grade] : [];
        var mathData = window.MATH_DATA && window.MATH_DATA[grade] ? window.MATH_DATA[grade] : [];
        var englishData = window.ENGLISH_DATA && window.ENGLISH_DATA[grade] ? window.ENGLISH_DATA[grade] : [];
        UNITS[grade] = {
            chinese: chineseData,
            math: mathData,
            english: englishData
        };
    }

    var CHALLENGES = [
        {
            id: 'ch1',
            title: '纸桥挑战',
            detail: '用5张A4纸折一座桥，架在两个纸杯之间，看看桥上能放几块积木而不塌？',
            tips: '试着把纸折成三角形或圆筒形，这样更结实！三角形是最稳定的形状哦。',
            category: '工程'
        },
        {
            id: 'ch2',
            title: '小手量一量',
            detail: '用你的小手当尺子，量一量家里的饭桌有几拃长？再来量量你的小床有几拃长？',
            tips: '张开大拇指和中指，两指尖之间的距离就是一拃（zhǎ）。记得每次量的时候要贴紧哦！',
            category: '测量'
        },
        {
            id: 'ch3',
            title: '风是热还是凉',
            detail: '找找家里哪个电器有散热口（比如电脑、冰箱、电视），在家长陪同下摸一摸吹出来的风是热还是凉？',
            tips: '注意安全！一定要让爸爸妈妈陪着你。电脑和电视的散热口通常在背面或侧面。',
            category: '观察'
        },
        {
            id: 'ch4',
            title: '投石机大作战',
            detail: '用筷子和橡皮筋做一个投石机，看看能把棉花糖弹多远？',
            tips: '用3根筷子绑成三角形做底座，再用1根筷子做杠杆，橡皮筋做动力。多试几次调整角度！',
            category: '工程'
        },
        {
            id: 'ch5',
            title: '最高塔挑战',
            detail: '用不同形状的积木搭一个最高的塔，数数用了多少块？想想怎么搭才不会倒？',
            tips: '把大积木放下面，小积木放上面。底座要宽，上面要窄，这样塔才稳！',
            category: '建造'
        },
        {
            id: 'ch6',
            title: '沉浮大猜想',
            detail: '在水盆里放不同的东西（木头、石头、塑料玩具、铁勺），先猜猜哪个会浮起来，哪个会沉下去？',
            tips: '猜完后再放进去看看对不对。轻的东西容易浮，重的东西容易沉。木头通常会浮起来哦！',
            category: '实验'
        },
        {
            id: 'ch7',
            title: '影子追踪',
            detail: '在阳光下的空地上，用粉笔画出自己的影子。每隔1小时回来画一次，看看影子有什么变化？',
            tips: '影子会随着太阳的位置改变方向和长短。早上影子长，中午影子短，傍晚影子又变长了。',
            category: '观察'
        },
        {
            id: 'ch8',
            title: '植物观察日记',
            detail: '选一种家里的植物，每天观察它的变化，记录叶子的大小、颜色，看看它喝了多少水？',
            tips: '可以用尺子量叶子，用照片记录变化。植物需要阳光和水才能长大哦！',
            category: '观察'
        },
        {
            id: 'ch9',
            title: '硬币魔术',
            detail: '把硬币放在碗里，从侧面看能看到吗？然后往碗里加水，看看会发生什么神奇的事情？',
            tips: '这是光的折射现象！水会让光线弯曲，你就能看到硬币"浮"起来了。',
            category: '实验'
        },
        {
            id: 'ch10',
            title: '气球小车',
            detail: '用空瓶子做车身，吸管做轮轴，气球做动力，看看你的小车能跑多远？',
            tips: '气球里的空气向后喷，小车就会向前跑。这就是牛顿第三定律：作用力与反作用力！',
            category: '工程'
        }
    ];

    window.LEARNING_DATA = { SUBJECTS: SUBJECTS, UNITS: UNITS, CHALLENGES: CHALLENGES };

    console.log('学习数据加载完成', {
        grades: Object.keys(UNITS).length,
        challenges: CHALLENGES.length
    });
})();
