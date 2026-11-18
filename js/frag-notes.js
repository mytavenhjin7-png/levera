/* LEVERA — what each perfume smells of: family | top | heart | base notes, shown on the product page.
   Keyed by product line; notes are written once in English and translated through NOTE_MN. */
(function () {
  const LV = window.LV;
  const FAMILY = { fresh: ['Шинэлэг', 'Fresh'], woody: ['Модлог', 'Woody'], floral: ['Цэцэгсийн', 'Floral'], amber: ['Амбр, халуун ногоот', 'Amber spicy'], gourmand: ['Амтат', 'Gourmand'], aromatic: ['Ургамлын', 'Aromatic'], leather: ['Арьсан', 'Leather'], citrus: ['Цитрус', 'Citrus'], aquatic: ['Далайн', 'Aquatic'], fruity: ['Жимсний', 'Fruity'], chypre: ['Шипр', 'Chypre'] };
  const NOTE_MN = {
    turmeric: 'куркума', akigalawood: 'акигала мод', seaweed: 'далайн ногоо',
    aldehydes: 'альдегид', almond: 'бүйлс', amber: 'амбр', ambergris: 'амбра', ambroxan: 'амброксан', ambrette: 'амбретт', apple: 'алим', apricot: 'гүйлс', artemisia: 'шарилж',
    bamboo: 'хулс', basil: 'базилик', 'bay leaf': 'лаврын навч', benzoin: 'бензоин', bergamot: 'бергамот', 'bitter almond': 'гашуун бүйлс', 'bitter orange': 'гашуун жүрж', 'black currant': 'үхрийн нүд', 'black pepper': 'хар перц', 'black tea': 'хар цай', blackberry: 'бөөрөлзгөнө', 'blood orange': 'улаан жүрж',
    cacao: 'какао', caramel: 'карамель', cardamom: 'кардамон', cashmeran: 'кашмеран', 'cashmere wood': 'кашмер мод', cedar: 'хуш мод', chamomile: 'тэмээн цэцэг', cherry: 'интоор', chestnut: 'туулайн бөөр', cinnamon: 'шанцай', citrus: 'цитрус', clary: 'мэргэн өвс', clove: 'хумс цэцэг', coconut: 'кокос', coffee: 'кофе', cognac: 'коньяк', coriander: 'кориандр', cotton: 'хөвөн', 'cotton flower': 'хөвөн цэцэг', cumin: 'зира', cypress: 'кипарис',
    davana: 'давана', 'dried fruit': 'хатаасан жимс', elemi: 'элеми', fig: 'инжир', fir: 'гацуур', frangipani: 'франжипани', frankincense: 'хүж', freesia: 'фрезия', gardenia: 'гардения', geranium: 'гераниум', ginger: 'цагаан гаа', grapefruit: 'бэрсүүт жүрж', 'green apple': 'ногоон алим', 'green notes': 'ногоон ноот', guaiac: 'гуаяк мод',
    hazelnut: 'самар', heliotrope: 'гелиотроп', honey: 'зөгийн бал', 'hedione': 'хедион', incense: 'хүж', iris: 'цахилдаг', jasmine: 'мэлрэг', juniper: 'арц', labdanum: 'лабданум', lavender: 'лаванда', leather: 'арьс', lemon: 'нимбэг', lily: 'сараана', 'lily of the valley': 'хөндийн сараана', lime: 'шохой', lotus: 'бадамлянхуа', lychee: 'личи',
    magnolia: 'магнолиа', mandarin: 'мандарин', mango: 'манго', 'maple': 'агч', matcha: 'матча', melon: 'амтат гуа', mimosa: 'мимоза', mint: 'гаа', moss: 'хөвд', musk: 'заарын үнэр', myrrh: 'мирра', neroli: 'нероли', nutmeg: 'мускат самар', oakmoss: 'царсны хөвд', orange: 'жүрж', 'orange blossom': 'жүржийн цэцэг', orchid: 'цахирмаа', orris: 'цахилдагийн үндэс', osmanthus: 'османтус', oud: 'оуд',
    palisander: 'палисандр', papyrus: 'папирус', patchouli: 'пачули', peach: 'тоор', pear: 'лийр', peony: 'цээнэ', pepper: 'перц', 'pink pepper': 'ягаан перц', pine: 'нарс', pineapple: 'хан боргоцой', plum: 'чавга', pomegranate: 'анар', praline: 'пралине', raspberry: 'бөөрөлзгөнө', rhubarb: 'гишүүнэ', rose: 'сарнай', rosemary: 'розмарин', rum: 'ром',
    saffron: 'заафран', sage: 'мэргэн өвс', salt: 'далайн давс', sandalwood: 'зандан', 'sea notes': 'далайн ноот', 'sichuan pepper': 'сычуань перц', smoke: 'утаа', 'sour cherry': 'исгэлэн интоор', spices: 'халуун ногоо', strawberry: 'гүзээлзгэнэ', styrax: 'стиракс', suede: 'илгэ', tea: 'цай', tobacco: 'тамхи', 'tonka bean': 'тонка', tuberose: 'туберроз', vanilla: 'ваниль', vetiver: 'ветивер', violet: 'нил цэцэг', 'violet leaf': 'нил цэцгийн навч', 'white flowers': 'цагаан цэцэгс', 'white musk': 'цагаан заар', wood: 'мод', 'ylang-ylang': 'иланг-иланг', yuzu: 'юзу',
    toffee: 'тофи', 'bourbon vanilla': 'бурбон ваниль', 'oriental wood': 'дорнын мод', rosewood: 'сарнайн мод', thyme: 'ганга', lilac: 'голт бор', verbena: 'вербена', peppermint: 'гаа', 'green tea': 'ногоон цай', birch: 'хус', quince: 'айва', hyacinth: 'гиацинт', 'water hyacinth': 'усны гиацинт', teak: 'тик мод', angelica: 'ангелика', licorice: 'чихэр өвс', 'red berries': 'улаан жимс', meringue: 'меренге', beeswax: 'зөгийн лав', amberwood: 'амбр мод', 'fir resin': 'гацуурын давирхай', ambrox: 'амброкс', olibanum: 'хүж', oak: 'царс', marshmallow: 'зефир', 'sugar cane': 'чихрийн нишингэ', milk: 'сүү', 'peru balsam': 'перу бальзам', 'mineral notes': 'эрдсийн ноот', myrtle: 'мирт', 'fig leaf': 'инжирийн навч', 'white pepper': 'цагаан перц', datura: 'датура', carnation: 'лиш цэцэг', opoponax: 'опопонакс', petitgrain: 'петигрен', fruits: 'жимс', 'black cherry': 'хар интоор'
  };
  const D = {
    // Azzaro
    'Azzaro Pour Homme': 'aromatic|lavender,lemon,bergamot,basil|cardamom,juniper,sandalwood|oakmoss,leather,amber',
    'Chrome Eau de Toilette': 'citrus|lemon,bergamot,pineapple|jasmine,coriander,cotton flower|musk,oakmoss,sandalwood',
    'Chrome Extreme': 'fresh|bergamot,mandarin|lavender,geranium|tonka bean,vanilla,cedar',
    'Chrome Parfum': 'aromatic|bergamot,green apple|sage,geranium|vetiver,ambroxan',
    'Forever Wanted Elixir': 'amber|grapefruit,cardamom|lavender,geranium|tonka bean,vanilla,cedar',
    'The Most Wanted Eau de Parfum Intense': 'amber|cardamom,ginger|lavender|toffee,amber,vanilla',
    'The Most Wanted Eau de Toilette Intense': 'amber|cardamom,ginger|lavender|amber,vanilla,wood',
    'The Most Wanted Parfum': 'amber|ginger,cardamom|bourbon vanilla,wood|amber,benzoin',
    'Wanted by Night': 'amber|cinnamon,cumin|tobacco,cedar|vanilla,leather,amber',
    'Wanted Eau de Toilette': 'aromatic|lemon,ginger,mint|cardamom,juniper,apple|vetiver,tonka bean,amber',
    'Wanted Elixir': 'amber|cardamom,lemon|apple,cedar|tonka bean,vanilla,vetiver',
    // Burberry
    'Burberry Hero Eau de Parfum': 'woody|bergamot,juniper|black pepper,cedar|incense,vetiver',
    'Burberry Hero Eau de Toilette': 'woody|bergamot|juniper,black pepper|cedar,vetiver',
    'Goddess Eau de Parfum': 'gourmand|lavender,ginger|vanilla,cacao|vanilla,wood',
    'Her Eau de Parfum': 'fruity|strawberry,raspberry,black currant|jasmine,violet|musk,amber,cashmeran',
    // Byredo
    'Bal d’Afrique Eau de Parfum': 'woody|bergamot,lemon,neroli|violet,jasmine|vetiver,cedar,musk',
    'Blanche Eau de Parfum': 'floral|aldehydes,rose,pink pepper|peony,violet|sandalwood,musk',
    'Gypsy Water Eau de Parfum': 'woody|bergamot,lemon,juniper|incense,pine,orris|vanilla,sandalwood,amber',
    'Mojave Ghost Eau de Parfum': 'floral|ambrette,violet|magnolia,sandalwood|cedar,amber,musk',
    // Chanel
    'Allure Homme Sport': 'fresh|orange,sea notes,mandarin|pepper,cedar,neroli|tonka bean,vanilla,white musk',
    'Bleu de Chanel Eau de Parfum': 'woody|grapefruit,lemon,mint|ginger,nutmeg,jasmine|incense,sandalwood,cedar',
    'Bleu de Chanel Parfum': 'woody|lemon,bergamot,mint|geranium,lavender|sandalwood,cedar,amber',
    'Chance Eau Fraîche': 'fresh|lemon,cedar|jasmine,water hyacinth|teak,patchouli,musk',
    'Chance Eau Tendre': 'floral|grapefruit,quince|jasmine,hyacinth|white musk,amber',
    'Coco Mademoiselle Eau de Parfum': 'amber|orange,bergamot,mandarin|rose,jasmine,lychee|patchouli,vanilla,white musk',
    'Gabrielle Essence': 'floral|mandarin,black currant|jasmine,tuberose,ylang-ylang|sandalwood,vanilla,musk',
    'N°5 Eau de Parfum': 'floral|aldehydes,neroli,ylang-ylang|rose,jasmine,iris|sandalwood,vanilla,vetiver',
    'N°5 L’Eau': 'fresh|lemon,mandarin,aldehydes|rose,jasmine,ylang-ylang|cedar,white musk',
    // CDG
    'Comme des Garçons 2 Eau de Parfum': 'woody|aldehydes,angelica|incense,cumin|amber,vetiver,labdanum',
    // Creed
    'Absolu Aventus': 'fruity|bergamot,lemon,pink pepper|pineapple,jasmine,birch|patchouli,oakmoss,musk',
    'Aventus Eau de Parfum': 'fruity|pineapple,bergamot,black currant,apple|birch,patchouli,jasmine|musk,oakmoss,ambergris,vanilla',
    'Aventus for Her': 'fruity|green apple,lemon,bergamot,pink pepper|rose,lilac,styrax|sandalwood,musk,peach',
    'Green Irish Tweed': 'fresh|lemon,verbena,peppermint|iris,violet leaf|sandalwood,ambergris',
    'Millésime Impérial': 'fresh|bergamot,lemon,mandarin|iris,sea notes|musk,sandalwood',
    'Silver Mountain Water': 'fresh|bergamot,mandarin|black currant,green tea|musk,sandalwood,petitgrain',
    'Viking': 'aromatic|bergamot,lemon,pink pepper|mint,lavender,rose|sandalwood,vetiver,patchouli',
    // Dior
    'Dior Homme Intense': 'floral|lavender|iris,pear,amber|cedar,vetiver',
    'Dior Homme Parfum': 'leather|iris,leather|cedar,oud|amber,vanilla',
    'Fahrenheit Eau de Toilette': 'leather|nutmeg,mandarin,lavender|violet leaf,cedar|leather,vetiver,musk',
    'Hypnotic Poison Eau de Toilette': 'amber|almond,coconut,plum|jasmine,tuberose,rosewood|vanilla,sandalwood,musk',
    'J’adore Eau de Parfum': 'floral|pear,melon,magnolia|jasmine,rose,orchid|musk,vanilla,cedar',
    'Miss Dior Blooming Bouquet': 'floral|mandarin,bergamot|peony,rose|white musk',
    'Miss Dior Eau de Parfum': 'floral|mandarin,rose|rose,lily of the valley|musk,sandalwood,vanilla',
    'Sauvage Eau de Parfum': 'amber|bergamot|nutmeg,sichuan pepper,lavender|ambroxan,vanilla,cedar',
    'Sauvage Eau de Toilette': 'fresh|bergamot,pepper|sichuan pepper,lavender,geranium|ambroxan,cedar,labdanum',
    'Sauvage Elixir': 'amber|cinnamon,nutmeg,cardamom,grapefruit|lavender|licorice,sandalwood,amber,patchouli',
    // JPG
    'Gaultier Divine Eau de Parfum': 'gourmand|sea notes,red berries|lily,frangipani|meringue,vanilla',
    'La Belle Eau de Parfum': 'gourmand|pear,bergamot|vanilla,orchid|vetiver,tonka bean',
    'La Belle Le Parfum': 'gourmand|pear,ginger|orange blossom|vanilla,tonka bean',
    'Le Beau Eau de Toilette': 'fresh|bergamot,mint|coconut|tonka bean,sandalwood',
    'Le Beau Le Parfum': 'gourmand|pineapple,iris|coconut,cypress|tonka bean,amber,sandalwood',
    'Le Beau Paradise Garden': 'fresh|green notes,fig|coconut,ginger|sandalwood,tonka bean',
    'Le Male Eau de Toilette': 'amber|mint,lavender,bergamot|cinnamon,orange blossom,cumin|vanilla,tonka bean,sandalwood',
    'Le Male Elixir': 'amber|lavender,mint|vanilla,benzoin|tonka bean,tobacco',
    'Le Male Elixir Absolu': 'amber|lavender,cardamom|cinnamon,vanilla|tobacco,tonka bean,wood',
    'Le Male Le Parfum': 'amber|cardamom,iris|lavender,vanilla|oriental wood,tonka bean',
    'Scandal Eau de Parfum': 'gourmand|blood orange,mandarin|honey,gardenia,orange blossom|patchouli,caramel,beeswax',
    'Scandal Pour Homme': 'amber|mandarin,clary|tonka bean,caramel|vetiver,benzoin',
    // Kilian
    'Angels’ Share': 'gourmand|cognac|cinnamon,tonka bean,oak|praline,vanilla,sandalwood',
    'Black Phantom': 'gourmand|rum,coffee|caramel,sugar cane|sandalwood,vetiver,almond',
    'Good Girl Gone Bad': 'floral|osmanthus,jasmine|rose,tuberose|cedar,amber',
    'Love, Don’t Be Shy': 'gourmand|neroli,bergamot,pink pepper|orange blossom,rose,jasmine|marshmallow,vanilla,musk',
    'Rolling in Love': 'floral|almond,ambrette|tuberose,iris|musk,cedar',
    // Le Labo
    'Another 13 Eau de Parfum': 'woody|pear,apple|ambroxan,jasmine|musk,moss',
    'Rose 31 Eau de Parfum': 'woody|rose,cumin|cedar,olibanum|vetiver,musk,amber',
    'Santal 33 Eau de Parfum': 'woody|cardamom,iris,violet|papyrus,ambrox|sandalwood,cedar,leather',
    'Thé Noir 29 Eau de Parfum': 'woody|bergamot,fig,bay leaf|black tea,cedar|tobacco,vetiver,musk',
    // MFK
    'Aqua Universalis': 'citrus|bergamot,lemon|lily of the valley|musk,wood',
    'Baccarat Rouge 540 Eau de Parfum': 'amber|saffron,jasmine|amberwood,ambergris|fir resin,cedar',
    'Baccarat Rouge 540 Extrait de Parfum': 'amber|bitter almond,saffron|jasmine,cedar|ambergris,musk,wood',
    'Gentle Fluidity Gold': 'amber|nutmeg,coriander|vanilla,juniper|musk,amber,wood',
    'Grand Soir Eau de Parfum': 'amber|benzoin,labdanum|tonka bean,vanilla|amber,cedar',
    'Oud Satin Mood Eau de Parfum': 'amber|violet,rose|oud,vanilla|benzoin,amber',
    // Margiela
    'Replica Autumn Vibes': 'woody|cardamom,pink pepper|moss,fir|cedar,musk',
    'Replica Beach Walk': 'floral|bergamot,pink pepper,lemon|ylang-ylang,coconut,heliotrope|musk,benzoin,cedar',
    'Replica Bubble Bath': 'fresh|bergamot,pink pepper|rose,lavender,coconut|white musk,patchouli',
    'Replica By the Fireplace': 'gourmand|pink pepper,orange blossom,clove|chestnut,guaiac|vanilla,cashmeran,peru balsam',
    'Replica Coffee Break': 'gourmand|lavender,coffee|milk,cacao|vanilla,sandalwood',
    'Replica Jazz Club': 'amber|pink pepper,lemon,neroli|rum,vetiver,clary|tobacco,vanilla,styrax',
    'Replica Lazy Sunday Morning': 'floral|pear,lily of the valley,aldehydes|iris,rose|white musk,ambrette',
    'Replica Matcha Meditation': 'woody|matcha,bergamot|jasmine,orange blossom|cacao,moss,cedar',
    'Replica Sailing Day': 'aquatic|bergamot,coriander,sea notes|salt,iris|ambergris,white musk',
    'Replica Under the Lemon Trees': 'citrus|lemon,bergamot|mint,green tea|cedar,musk',
    'Replica When the Rain Stops': 'fresh|bergamot,pink pepper|rose,jasmine,sea notes|patchouli,moss,musk',
    // PdM
    'Althaïr Eau de Parfum': 'amber|bergamot,orange blossom,cinnamon|cardamom,vanilla|praline,musk,amber',
    'Delina Eau de Parfum': 'floral|lychee,rhubarb,bergamot|rose,peony,vanilla|cashmeran,incense,musk',
    'Herod Eau de Parfum': 'amber|cinnamon,pepper|tobacco,incense|vanilla,cedar,patchouli',
    'Layton Eau de Parfum': 'amber|apple,lavender,bergamot|jasmine,violet,geranium|vanilla,cardamom,sandalwood',
    'Pegasus Eau de Parfum': 'amber|bitter almond,bergamot,heliotrope|jasmine,lavender|vanilla,sandalwood,amber',
    'Valaya Eau de Parfum': 'floral|aldehydes,bergamot,mandarin|orange blossom,peach|white musk,vanilla,wood',
    // Tom Ford
    'Bitter Peach Eau de Parfum': 'fruity|peach,blood orange,cardamom|rum,cognac,jasmine|patchouli,vanilla,tonka bean',
    'Lost Cherry Eau de Parfum': 'gourmand|black cherry,bitter almond|sour cherry,rose,jasmine|tonka bean,vanilla,sandalwood',
    'Noir Extreme Eau de Parfum': 'amber|mandarin,cardamom,nutmeg|rose,jasmine,orange blossom|vanilla,amber,sandalwood',
    'Ombré Leather Parfum': 'leather|cardamom|leather,jasmine|amber,moss,patchouli',
    'Oud Wood Parfum': 'woody|rosewood,cardamom,sichuan pepper|oud,sandalwood,vetiver|tonka bean,vanilla,amber',
    'Tobacco Vanille Parfum': 'gourmand|tobacco,spices|vanilla,cacao,tonka bean|dried fruit,wood',
    'Tuscan Leather Eau de Parfum': 'leather|raspberry,saffron,thyme|olibanum,jasmine|leather,suede,amber',
    // Valentino
    'Born in Roma Coral Fantasy': 'fruity|apple,pink pepper|rose,jasmine|vanilla,patchouli',
    'Born in Roma Donna Eau de Parfum': 'floral|black currant,bergamot|jasmine,orange blossom|vanilla,cashmeran',
    'Born in Roma Donna Intense': 'amber|black currant|jasmine|vanilla,benzoin,cashmere wood',
    'Born in Roma Uomo Eau de Toilette': 'aromatic|mineral notes,ginger|sage,violet leaf|vetiver,cedar',
    'Born in Roma Uomo Intense': 'amber|vanilla,lavender|sage|vetiver,vanilla',
    'Born in Roma Yellow Dream': 'citrus|lemon,bergamot|ginger,jasmine|ambroxan,vanilla',
    'Valentino Donna Eau de Parfum': 'floral|bergamot,iris|rose,leather|vanilla,patchouli',
    'Valentino Uomo Eau de Toilette': 'leather|bergamot,myrtle|coffee,hazelnut|leather,cedar',
    // Versace
    'Bright Crystal': 'floral|pomegranate,yuzu|peony,magnolia,lotus|musk,amber',
    'Dylan Blue Pour Homme': 'aromatic|bergamot,grapefruit,fig leaf|violet leaf,black pepper,ambroxan|incense,musk,tonka bean',
    'Eros Eau de Parfum': 'amber|mint,green apple,lemon|tonka bean,geranium|vanilla,cedar,vetiver',
    'Eros Eau de Toilette': 'amber|mint,green apple,lemon|tonka bean,geranium,ambroxan|vanilla,vetiver,cedar',
    'Eros Energy': 'citrus|lemon,blood orange,bergamot|pink pepper,lime|white musk,patchouli',
    'Eros Flame': 'amber|lemon,mandarin,black pepper|pepper,rose|vanilla,tonka bean,sandalwood',
    'Pour Homme': 'aromatic|lemon,neroli,bergamot|hyacinth,clary,cedar|tonka bean,musk,amber',
    // Xerjoff
    '40 Knots Eau de Parfum': 'aquatic|bergamot,lemon|sea notes,lavender|ambergris,musk',
    'Alexandria II Parfum': 'woody|lavender,rosewood,cinnamon|rose,cedar,lily|oud,amber,sandalwood',
    'Erba Pura Eau de Parfum': 'fruity|orange,lemon,bergamot|fruits|musk,vanilla,amber',
    'Naxos Eau de Parfum': 'gourmand|lavender,bergamot,lemon|honey,cinnamon,cashmeran|tobacco,vanilla,tonka bean',
    // YSL
    'Black Opium Eau de Parfum': 'gourmand|pear,pink pepper,orange blossom|coffee,jasmine,bitter almond|vanilla,patchouli,cedar',
    'Black Opium Le Parfum': 'gourmand|pear,coffee|jasmine,orange blossom|vanilla,patchouli',
    'L’Homme Eau de Toilette': 'woody|ginger,bergamot,lemon|violet leaf,basil,white pepper|tonka bean,cedar,vetiver',
    'La Nuit de L’Homme': 'amber|cardamom|lavender,cedar,bergamot|vetiver,cumin',
    'Libre Eau de Parfum': 'floral|lavender,mandarin,black currant|orange blossom,jasmine|vanilla,musk,cedar',
    'Libre Flowers & Flames': 'floral|mandarin,orange blossom|jasmine|coconut,vanilla,musk',
    'Libre Intense': 'amber|lavender,bergamot|orchid,jasmine,orange blossom|vanilla,tonka bean,ambergris',
    'Libre Le Parfum': 'amber|lavender,ginger|orange blossom|vanilla,honey,tonka bean',
    'Mon Paris Eau de Parfum': 'fruity|strawberry,pear,raspberry|peony,datura,jasmine|patchouli,white musk',
    'MYSLF Eau de Parfum': 'woody|bergamot|orange blossom|patchouli,cedar',
    'Opium Eau de Parfum': 'amber|mandarin,plum,clove|jasmine,rose,carnation|vanilla,myrrh,opoponax',
    'Y Eau de Parfum': 'aromatic|apple,ginger,bergamot|sage,juniper,geranium|amber,tonka bean,cedar',
    'Black Lacquer Eau de Parfum': 'woody|black pepper,pink pepper,elemi|incense,vetiver,cedar|patchouli,styrax',
    'Bois Pacifique Eau de Parfum': 'woody|cardamom,turmeric|akigalawood,sandalwood|ambergris,cedar',
    'Café Rose Eau de Parfum': 'floral|saffron,coffee|rose|patchouli,incense,amber',
    'Electric Cherry Eau de Parfum': 'fruity|cherry,pink pepper,ginger|jasmine|white musk,ambrette',
    'Figue Érotique Eau de Parfum': 'fruity|fig,rum,coconut|jasmine,peach|patchouli,benzoin',
    'Fucking Fabulous Eau de Parfum': 'leather|clary,lavender,bitter almond|orris,leather|tonka bean,vanilla,cashmeran',
    'Myrrhe Mystère Eau de Parfum': 'amber|pink pepper,saffron|myrrh,incense|vanilla,benzoin',
    'Neroli Portofino Eau de Parfum': 'citrus|bergamot,mandarin,lemon,neroli|orange blossom,lavender,rosemary|ambergris,angelica,amber',
    'Ombré Leather Eau De Parfum': 'leather|cardamom|leather,jasmine|amber,moss,patchouli',
    'Ombré Leather Reserve': 'leather|cardamom,pink pepper|leather,jasmine|amber,birch,patchouli',
    'Oud Minérale Eau de Parfum': 'aquatic|sea notes,pink pepper,juniper|seaweed,oud|ambergris,sandalwood,vetiver',
    'Oud Voyager Eau de Parfum': 'woody|saffron,cardamom|oud,rose|leather,amber,patchouli',
    'Oud Wood Eau de Parfum': 'woody|rosewood,cardamom,sichuan pepper|oud,sandalwood,vetiver|tonka bean,vanilla,amber',
    'Rose Exposed Eau de Parfum': 'floral|cardamom,pink pepper|rose,orris|leather,musk,ambrette',
    'Rose Prick Eau de Parfum': 'floral|sichuan pepper,turmeric|rose,patchouli|tonka bean',
    'Soleil de Feu Eau de Parfum': 'floral|bergamot|tuberose,ylang-ylang,jasmine|sandalwood,amber,musk',
    'Soleil Neige Eau de Parfum': 'floral|bergamot,mandarin|orange blossom,jasmine,rose|labdanum,benzoin,vanilla',
    'Taormina Orange Eau de Parfum': 'citrus|blood orange,bergamot,mandarin|neroli,orange blossom|ambergris,musk',
    'Tobacco Chocolat Eau de Parfum': 'gourmand|orange,cacao|tobacco,honey|cognac,vanilla,tonka bean',
    'Vanilla Sex Eau de Parfum': 'gourmand|bitter almond|vanilla,orris|sandalwood,tonka bean,musk',
    'Althaïr': 'amber|orange blossom,cinnamon,bergamot,cardamom|bourbon vanilla,praline|musk,guaiac,ambrox',
    'Althaïr Exclusif': 'amber|orange blossom,cinnamon,cardamom|bourbon vanilla,praline,elemi|musk,guaiac,ambrox',
    'Castley': 'aromatic|bergamot,lime,black pepper|lavender,orange blossom|vanilla,tonka bean,sandalwood',
    'Galloway': 'citrus|lemon,bergamot,black pepper|orange blossom,iris|musk,amber',
    'Godolphin': 'leather|saffron,cypress,thyme|rose,jasmine|leather,amber,vanilla',
    'Greenley': 'fresh|green apple,bergamot,mandarin|violet leaf,cashmeran|cedar,oakmoss,musk',
    'Herod': 'amber|cinnamon,pepper|tobacco,incense|vanilla,cedar,patchouli',
    'Kalan': 'aromatic|blood orange,black pepper,bergamot|lavender,orange blossom|cedar,amber,oakmoss',
    'Pegasus': 'amber|bitter almond,bergamot,heliotrope|jasmine,lavender|vanilla,sandalwood,amber',
    'Percival': 'fresh|bergamot,lime,lavender|geranium,jasmine|ambroxan,amber,musk',
    'Perseus': 'citrus|grapefruit,bergamot,pink pepper|vetiver,lavender|cedar,ambroxan,musk',
    'Sedley': 'fresh|mint,bergamot,lemon|lavender,geranium|cedar,sandalwood,musk',
    'Y Elixir': 'aromatic|lavender,geranium|sage,juniper|incense,oud,tonka bean'
  };
  const name = n => (LV.lang === 'mn' ? (NOTE_MN[n] || n) : n);
  // { family, top, heart, base } in the current language, or null for pieces without notes
  LV.fragNotes = line => {
    const row = D[line]; if (!row) return null;
    const [f, a, b, c] = row.split('|'), list = s => s.split(',').map(name).join(', ');
    return { family: (FAMILY[f] || ['', ''])[LV.lang === 'mn' ? 0 : 1], top: list(a), heart: list(b), base: list(c) };
  };
  // raw English row (family|top|heart|base) and one note in the current language, for the scent quiz
  LV.fragRaw = line => D[line] || null;
  // a short description from the notes: how it opens, develops and dries down, and when it suits best
  const WHEN = {
    fresh: ['Өдөр тутам, ажил, дулаан улиралд тохиромжтой.', 'Best for daytime, work and warm weather.'],
    amber: ['Орой, онцгой үйл явдал, хүйтэн улиралд тохиромжтой. Манай өвөлд удаан тогтоно.', 'Best for evenings, big nights and cold weather; it lasts well in winter.'],
    floral: ['Өдөр болон оройн аль алинд, хавар намарт тохиромжтой.', 'Works day and night, especially in spring and autumn.']
  };
  const WHEN_OF = { fresh: 'fresh', citrus: 'fresh', aquatic: 'fresh', aromatic: 'fresh', amber: 'amber', gourmand: 'amber', leather: 'amber', woody: 'amber', floral: 'floral', fruity: 'floral', chypre: 'floral' };
  LV.fragStory = line => {
    const row = D[line]; if (!row) return '';
    const [f, a, b, c] = row.split('|'), two = x => x.split(',').slice(0, 3).map(name).join(', '), mn = LV.lang === 'mn';
    const fam = (FAMILY[f] || ['', ''])[mn ? 0 : 1], when = WHEN[WHEN_OF[f] || 'floral'][mn ? 0 : 1];
    return mn ? fam + ' үнэр. Түрхэнгүүт ' + two(a) + ' мэдрэгдэж, дараа нь ' + two(b) + ' нот гарч ирээд, сүүлд нь ' + two(c) + ' суурь арьсан дээр удаан үлдэнэ. ' + when
      : 'A ' + fam.toLowerCase() + ' scent. It opens with ' + two(a) + ', moves to a heart of ' + two(b) + ' and dries down to ' + two(c) + '. ' + when;
  };
  LV.noteName = name;
})();
