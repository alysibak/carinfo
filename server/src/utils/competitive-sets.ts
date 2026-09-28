import type { CarSpecs } from '../types/car.types.js';

/**
 * The classes shoppers compare within: a Camry against an Accord, a Sonata
 * and an Altima, not against a Civic of the same price. EPA's size classes
 * measure interior volume (a 2022 Civic is "Midsize", like a Camry), and
 * price alone put a Maxima and a Forte beside a Camry, a Santa Fe Hybrid
 * beside a Wrangler. Nameplates are matched on "make model trim", lower case,
 * and one can sit in two sets (a Supra rivals both a BRZ and a Cayman).
 */
export type CompetitiveSet =
  | 'subcompact-car'
  | 'compact-car'
  | 'sport-compact'
  | 'midsize-car'
  | 'large-car'
  | 'entry-luxury-car'
  | 'midsize-luxury-car'
  | 'flagship-sedan'
  | 'subcompact-suv'
  | 'compact-suv'
  | 'midsize-suv'
  | 'three-row-suv'
  | 'full-size-suv'
  | 'off-roader'
  | 'subcompact-luxury-suv'
  | 'compact-luxury-suv'
  | 'midsize-luxury-suv'
  | 'full-size-luxury-suv'
  | 'compact-pickup'
  | 'midsize-pickup'
  | 'full-size-pickup'
  | 'heavy-duty-pickup'
  | 'pony-car'
  | 'affordable-sports-car'
  | 'premium-sports-car'
  | 'grand-tourer'
  | 'supercar'
  | 'small-ev'
  | 'ev-sedan'
  | 'ev-suv'
  | 'ev-pickup'
  | 'minivan'
  | 'compact-van'
  | 'full-size-van'
  | 'family-coupe';

type Member = RegExp | ((name: string, car: CarSpecs) => boolean);

const SETS: Record<CompetitiveSet, Member[]> = {
  'subcompact-car': [
    /^toyota (yaris|echo|prius c)\b/,
    /^honda fit\b/,
    /^hyundai accent\b/,
    /^kia rio\b/,
    /^nissan (versa|micra)\b/,
    /^mitsubishi mirage\b/,
    /^chevrolet (sonic|aveo|spark)\b/,
    /^ford fiesta(?! st)\b/,
    /^scion (xa|xd|ia)\b/,
    /^fiat 500(?![xl])/,
    /^mazda 2\b/,
    /^suzuki swift\b/,
    /^smart fortwo\b/,
    /^scion iq\b/,
    /^pontiac (wave|g3)\b/,
    /^mini (cooper|clubman|hardtop)\b(?!.*\b(s|jcw|john cooper works|countryman|paceman)\b)/,
  ],
  'compact-car': [
    /^toyota (corolla(?! cross)|matrix|prius(?! c\b))\b/,
    /^honda (civic|insight)\b(?!.*\b(si|type r)\b)/,
    /^hyundai (elantra(?! n\b)|ioniq(?! \d))\b/,
    /^kia (forte|k4|spectra|soul)\b(?!.*\bgt\b)/,
    /^nissan (sentra|cube)\b/,
    /^volkswagen (jetta(?! gli)|golf(?! (gti|r)\b)|rabbit|beetle|new beetle)\b/,
    /^mazda (3|protege)\b/,
    /^subaru impreza\b(?!.*\b(wrx|sti)\b)/,
    /^chevrolet (cruze|cobalt|cavalier|volt)\b/,
    /^ford (focus(?! (st|rs)\b)|c-max)\b/,
    /^dodge (dart|neon|caliber)\b/,
    /^mitsubishi lancer(?! evolution)\b/,
    /^scion (tc|im|xb)\b/,
    /^pontiac (g5|vibe|sunfire)\b/,
    /^saturn (ion|astra)\b/,
    /^suzuki (sx4|aerio|forenza|reno)\b/,
    /^chevrolet (optra|hhr)\b/,
    /^saab 9-2x\b/,
    /^kia rondo\b/,
    /^buick verano\b/,
    /^chrysler pt cruiser\b/,
  ],
  'sport-compact': [
    /^volkswagen (golf gti|gti|golf r|jetta gli|gli)\b/,
    /^honda civic\b.*\b(si|type r)\b/,
    /^subaru (wrx|impreza wrx|impreza sti)\b/,
    /^subaru impreza\b.*\b(wrx|sti)\b/,
    /^sti\b/,
    /^hyundai (elantra n|veloster n|veloster)\b/,
    /^mazda 3\b.*\bturbo\b/,
    /^mazda (mazda)?speed ?3\b/,
    /^mini (cooper s|john cooper works|jcw|clubman s)\b(?!.*\b(countryman|paceman)\b)/,
    /^ford (focus (st|rs)|fiesta st)\b/,
    /^toyota gr corolla\b/,
    /^acura integra\b.*\btype s\b/,
    /^mitsubishi lancer evolution\b/,
    /^kia forte\b.*\bgt\b/,
  ],
  'midsize-car': [
    /^toyota camry(?! solara)\b/,
    /^honda accord(?! (crosstour|coupe))\b/,
    /^nissan altima(?! coupe)\b/,
    /^hyundai sonata\b/,
    /^kia (optima|k5)\b/,
    /^mazda (6|626|mazdaspeed ?6)\b/,
    /^chevrolet malibu\b/,
    /^subaru legacy\b/,
    /^volkswagen (passat|cc|arteon)\b/,
    /^ford fusion\b/,
    /^chrysler (200|sebring)(?! convertible)\b/,
    /^dodge (avenger|stratus)\b/,
    /^buick regal\b/,
    /^pontiac (g6|grand am)\b/,
    /^saturn aura\b/,
    /^mitsubishi galant\b/,
    /^suzuki kizashi\b/,
    /^mercury milan\b/,
    /^(chevrolet (epica|classic)|suzuki verona|buick century|saturn l\w*\d{3})\b/,
  ],
  'large-car': [
    /^toyota avalon\b/,
    /^chevrolet (impala|ss)\b/,
    /^nissan maxima\b/,
    /^dodge (charger|magnum)\b/,
    /^chrysler 300\w*\b/,
    /^toyota crown\b/,
    /^ford (taurus(?! x)|five hundred|crown victoria)\b/,
    /^hyundai azera\b/,
    /^kia (cadenza|amanti)\b/,
    /^hyundai xg\d{3}\b/,
    /^mitsubishi diamante\b/,
    /^buick (lacrosse|lucerne|lesabre|park avenue)\b/,
    /^mercury (grand marquis|montego|sable|marauder)\b/,
    /^pontiac (grand prix|bonneville|g8)\b/,
  ],
  'entry-luxury-car': [
    /^bmw (1\d\d|2\d\d|m2\d\d|3\d\d|m3|m3\d\d|4\d\d|m4\d\d)/,
    /^mercedes-benz (c ?\d{3}|cla|c-class|amg c ?\d{2}|amg cla|c\d\d amg|clk)/,
    /^audi (a3|s3|rs ?3|a4|s4|rs ?4|a5|s5|rs ?5)\b/,
    /^mercedes-benz (a ?\d{3}|amg a ?\d{2})/,
    /^lexus (is|hs|ct|rc)\b/,
    /^infiniti (g ?\d{2}x?|q40|q50\w*|q60|g20|i30|i35)\b/,
    /^acura (tl|tlx|tsx|ilx|integra|rsx)\b/,
    /^cadillac (ats|ct4|catera)\b/,
    /^genesis g70\b/,
    /^alfa romeo giulia\b/,
    /^volvo (s60|s40|v60\w*|v50|c30|c70)\b/,
    /^jaguar (xe|x-type)\b/,
    /^saab 9-3x?\b/,
    /^kia stinger\b/,
    /^bmw activehybrid 3\b/,
    /^lincoln (mkz|zephyr)\b/,
  ],
  'midsize-luxury-car': [
    /^bmw (5\d\d|m5|activehybrid 5|(6\d\d|m6|8\d\d|m8|m850).*gran coupe|alpina b[68])/,
    /^mercedes-benz (e ?\d{3}(?!.*(coupe|convertible|cabriolet))|e-class|cls|amg e ?\d{2}(?!.*(coupe|convertible|cabriolet))|e\d\d amg|amg cls)/,
    /^audi (a6|s6|rs ?6|a7|s7|rs ?7|allroad)\b/,
    /^lexus (gs|es)\b/,
    /^infiniti (m\d{2}\w*|q70\w*)\b/,
    /^acura (rl|rlx)\b/,
    /^cadillac (cts|ct5|sts|seville)\b/,
    /^genesis g80\b/,
    /^hyundai genesis(?! coupe)\b/,
    /^jaguar (xf|s-type)\b/,
    /^volvo (s80|s90|v70|v90\w*)\b/,
    /^lincoln (mks|ls)\b/,
    /^maserati ghibli\b/,
    /^saab 9-5\b/,
  ],
  'flagship-sedan': [
    /^bmw (7\d\d|m760|alpina b7|i7|activehybrid 7)/,
    /^mercedes-benz (s ?\d{3}|s-class|amg s ?\d{2}|s\d\d amg|maybach)(?!.*(coupe|convertible|cabriolet))/,
    /^maybach\b/,
    /^audi (a8|s8)\b/,
    /^lexus ls\b/,
    /^genesis g90\b/,
    /^hyundai equus\b/,
    /^kia k900\b/,
    /^cadillac (ct6|xts|dts|deville)\b/,
    /^lincoln (continental|town car)\b/,
    /^maserati quattroporte\b/,
    /^porsche panamera\b/,
    /^jaguar (xj\w*|vanden plas|vdp|super v8)\b/,
    /^infiniti q45\b/,
    /^volkswagen phaeton\b/,
    /^bentley (flying spur|mulsanne|arnage|continental flying spur)\b/,
    /^rolls-royce (ghost|phantom|silver)\b/,
    /^mercedes-maybach\b/,
  ],
  'subcompact-suv': [
    /^honda (hr-v|element)\b/,
    /^mazda (cx-3|cx-30)\b/,
    /^hyundai (kona(?! electric)|venue)\b/,
    /^kia (seltos|niro(?! ev))\b/,
    /^nissan (kicks|juke|rogue sport)\b/,
    /^chevrolet (trax|tracker)\b/,
    (name, car) => /^chevrolet trailblazer\b/.test(name) && car.year >= 2021,
    /^buick (encore(?! gx)|envista)\b/,
    /^subaru (xv )?crosstrek\b/,
    /^jeep renegade\b/,
    /^toyota (c-hr|corolla cross)\b/,
    /^ford ecosport\b/,
    /^volkswagen taos\b/,
    /^mitsubishi (outlander sport|rvr)\b/,
    /^fiat 500x\b/,
    /^mini ((cooper )?(s )?|jcw |john cooper works )(countryman|paceman)\b/,
  ],
  'compact-suv': [
    /^toyota rav4\b/,
    /^honda cr-v\b/,
    /^nissan (rogue(?! sport)|x-trail)\b/,
    /^mazda (cx-5|cx-50|cx-7|tribute)\b/,
    /^hyundai (tucson|santa fe sport)\b/,
    /^kia sportage\b/,
    /^ford (escape|bronco sport)\b/,
    /^chevrolet (equinox|captiva)\b/,
    /^gmc terrain\b/,
    /^subaru forester\b/,
    /^volkswagen tiguan\b/,
    /^jeep (cherokee|compass|liberty|patriot)\b/,
    /^mitsubishi (outlander(?! sport)|eclipse cross)\b/,
    /^dodge (journey|nitro)\b/,
    /^buick (envision|encore gx)\b/,
    /^mercury mariner\b/,
    /^saturn vue\b/,
    /^suzuki grand vitara\b/,
    /^pontiac torrent\b/,
    /^dodge hornet\b/,
  ],
  'midsize-suv': [
    /^honda (passport|crosstour|accord crosstour)\b/,
    /^pontiac aztek\b/,
    /^ford edge\b/,
    /^nissan murano\b/,
    (name, car) => /^chevrolet blazer(?! ev)\b/.test(name) && car.year >= 2019,
    /^hyundai santa fe(?! (sport|xl))\b/,
    /^kia sorento\b/,
    /^volkswagen (atlas cross sport|touareg)\b/,
    /^toyota venza\b/,
    /^jeep grand cherokee(?! l\b)\b/,
    /^subaru outback\b/,
    /^mazda cx-70\b/,
    (name, car) => /^chevrolet trailblazer\b/.test(name) && car.year < 2021,
    /^gmc envoy\b/,
    /^chevrolet trailblazer ext\b/,
    /^(isuzu ascender|buick (rainier|rendezvous)|saab 9-7x)\b/,
  ],
  'three-row-suv': [
    /^toyota (highlander|grand highlander)\b/,
    /^honda pilot\b/,
    /^kia (telluride|sorento|borrego)\b/,
    /^hyundai (palisade|santa fe xl|veracruz)\b/,
    /^volkswagen atlas(?! cross)\b/,
    /^ford (explorer(?! sport trac)|flex)\b/,
    /^chevrolet traverse\b/,
    /^gmc acadia\b/,
    /^buick enclave\b/,
    /^nissan pathfinder\b/,
    /^mazda (cx-9|cx-90)\b/,
    /^subaru (ascent|tribeca|b9 tribeca)\b/,
    /^dodge durango\b/,
    /^jeep grand cherokee l\b/,
    /^mitsubishi endeavor\b/,
    /^saturn outlook\b/,
    /^jeep commander\b/,
    /^mercury mountaineer\b/,
    /^ford (freestyle|taurus x)\b/,
    /^suzuki xl-?7\b/,
    /^mercedes-benz r ?\d{3}\b/,
  ],
  'full-size-suv': [
    /^chevrolet (tahoe|suburban)\b/,
    /^gmc yukon\b/,
    /^ford (expedition|excursion)\b/,
    /^toyota sequoia\b/,
    /^nissan armada\b/,
    // Not the Wagoneer S, a mid-size electric SUV.
    /^jeep (wagoneer(?! s\b)|grand wagoneer)\b/,
    /^chrysler aspen\b/,
  ],
  'off-roader': [
    /^jeep (wrangler|gladiator)\b/,
    /^ford bronco(?! sport)\b/,
    /^toyota (4runner|fj cruiser|land cruiser)\b/,
    /^land rover defender\b/,
    /^mercedes-benz (g ?\d{3}|g-class|amg g ?\d{2}|g\d{2} amg)\b/,
    /^lexus gx\b/,
    /^nissan xterra\b/,
    /^hummer h[123]\b/,
    /^ineos( automotive)? grenadier\b/,
    /^mitsubishi montero\b/,
    /^suzuki (samurai|sidekick|jimny|vitara)\b/,
    /^(chevrolet|geo) tracker\b/,
  ],
  'subcompact-luxury-suv': [
    /^bmw (x1|x2)\b/,
    /^mercedes-benz (amg )?(gla|glb)/,
    /^audi (q3|sq3|q2)\b/,
    /^lexus ux\b/,
    /^volvo (xc40|c40)\b/,
    /^infiniti qx30\b/,
    /^cadillac xt4\b/,
    /^lincoln (corsair|mkc)\b/,
    /^land rover ((range rover )?evoque|discovery sport|lr2)\b/,
    /^jaguar e-pace\b/,
    /^alfa romeo tonale\b/,
    /^acura (adx|cdx)\b/,
  ],
  'compact-luxury-suv': [
    /^bmw (x3|x4|ix3)\b/,
    /^mercedes-benz (amg )?(glc|glk)/,
    /^audi (q5|sq5)\b/,
    /^lexus nx\b/,
    /^acura (rdx|zdx)\b/,
    /^volvo xc60\b/,
    /^infiniti (qx50|qx55|ex\d{2})\b/,
    /^cadillac (xt5|srx)\b/,
    /^lincoln (mkx|nautilus)\b/,
    /^genesis gv70\b/,
    /^porsche macan\b/,
    /^jaguar f-pace\b/,
    /^alfa romeo stelvio\b/,
    /^land rover (range rover velar|freelander)\b/,
    /^maserati grecale\b/,
    /^saab 9-4x\b/,
  ],
  'midsize-luxury-suv': [
    /^bmw (x5|x6|xm|ix|activehybrid x6)\b/,
    /^mercedes-benz (amg )?(gle|ml ?\d|m-class)/,
    /^audi (q7|q8|sq7|sq8|rs ?q8|e-tron(?! gt))\b/,
    /^lexus (rx|gx|tx)\b/,
    /^acura mdx\b/,
    /^volvo (xc90|xc70)\b/,
    /^infiniti (qx60|qx70|jx35|fx\d{2})\b/,
    /^cadillac (xt6|lyriq)\b/,
    /^lincoln (aviator|mkt)\b/,
    /^genesis gv80\b/,
    /^porsche cayenne\b/,
    /^land rover (range rover sport|discovery(?! sport)|lr3|lr4)\b/,
    /^maserati levante\b/,
    /^tesla model x\b/,
    /^aston martin dbx\b/,
  ],
  'full-size-luxury-suv': [
    /^cadillac escalade\b/,
    /^lincoln navigator\b/,
    /^mercedes-benz (amg )?(gls|gl ?\d|maybach gls|g ?\d{3}|g-class|amg g ?\d{2})/,
    /^bmw (x7|alpina xb7)\b/,
    /^lexus lx\b/,
    /^infiniti (qx80|qx56)\b/,
    /^land rover range rover(?! (sport|evoque|velar))\b/,
    /^gmc yukon\b.*\bdenali\b/,
    /^jeep grand wagoneer\b/,
    /^rolls-royce cullinan\b/,
    /^bentley bentayga\b/,
    /^lamborghini urus\b/,
  ],
  'compact-pickup': [/^ford maverick\b/, /^hyundai santa cruz\b/, /^subaru baja\b/],
  'midsize-pickup': [
    /^toyota tacoma\b/,
    /^chevrolet (colorado|s10)\b/,
    /^gmc (canyon|sonoma)\b/,
    /^ford ranger\b/,
    /^nissan (frontier|pickup)\b/,
    /^honda ridgeline\b/,
    /^jeep gladiator\b/,
    /^dodge dakota\b/,
    /^mitsubishi raider\b/,
    /^isuzu i-\d{3}\b/,
    /^mazda b\d{4}\b/,
    /^suzuki equator\b/,
    /^ford explorer sport trac\b/,
    /^hummer h3t\b/,
  ],
  'full-size-pickup': [
    /^ford f-?150(?! lightning)\b/,
    /^chevrolet (silverado|avalanche)\b(?!.*\b(2500|3500|hd)\b)/,
    /^gmc sierra\b(?!.*\b(2500|3500|hd)\b)/,
    /^(dodge )?ram 1500\b/,
    /^dodge ram 1500\b/,
    /^toyota (tundra|t100)\b/,
    /^nissan titan(?! xd)\b/,
    /\bf-?150\b(?!.*lightning)/,
    /^lincoln mark lt\b/,
  ],
  'heavy-duty-pickup': [
    /^ford f-?(250|350|450)\b/,
    /^chevrolet silverado\b.*\b(2500|3500|hd)\b/,
    /^gmc sierra\b.*\b(2500|3500|hd)\b/,
    /^(dodge )?ram (2500|3500)\b/,
    /^nissan titan xd\b/,
  ],
  'pony-car': [
    /^ford (mustang(?! mach-e)|shelby)\b/,
    /^chevrolet camaro\b/,
    /^dodge challenger\b/,
    /^pontiac (firebird|gto)\b/,
    /^roush performance\b(?!.*f-?150)/,
    /^saleen\b/,
  ],
  'affordable-sports-car': [
    /^mazda (mx-5|miata|rx-8|rx-7)\b/,
    /^toyota ((gr ?)?86|(gr )?supra|celica|mr2)\b/,
    /^subaru brz\b/,
    /^scion fr-s\b/,
    /^nissan (350z|370z|z|240sx|300zx)\b/,
    /^hyundai genesis coupe\b/,
    /^honda (s2000|prelude|cr-z)\b/,
    /^fiat 124 spider\b/,
    /^mitsubishi eclipse(?! cross)\b/,
    /^pontiac solstice\b/,
    /^saturn sky\b/,
    /^chrysler crossfire\b/,
  ],
  'premium-sports-car': [
    /^porsche (911|718|boxster|cayman|carrera|turbo|targa|9[1-9]\d)\b/,
    /^chevrolet corvette\b/,
    /^mercedes-benz (amg gt(?!.*4-door)|(amg )?(sl|slk|slc) ?\d*|sls|slr)\b/,
    /^bmw (z3|z4|z8|m2|m4|m6|m8|i8)\b(?!.*gran coupe)/,
    /^audi (tt(s| ?rs)?|r8)\b/,
    /^jaguar (f-type|xk\w*)\b/,
    /^nissan gt-r\b/,
    /^lexus (lc|rc ?f)\b/,
    /^lotus\b/,
    /^aston martin (v8 vantage|v12 vantage|vantage)\b/,
    /^acura nsx\b/,
    /^toyota (gr )?supra\b/,
    /^alfa romeo (4c|8 ?c)\b/,
    /^dodge viper\b/,
    /^srt viper\b/,
    /^cadillac xlr\b/,
    /^maserati (mc20|mcpura)\b/,
  ],
  'grand-tourer': [
    /^bmw (6\d\d|8\d\d|m850)(?!.*gran coupe)/,
    /^mercedes-benz (cl ?\d|amg cl ?\d|cle|(s|e) ?\d{3}.*(coupe|convertible|cabriolet)|amg (s|e|cle) ?\d{2}.*(coupe|convertible|cabriolet))/,
    /^lexus (lc|sc)\b/,
    /^bentley (continental(?! flying)|azure|brooklands)\b/,
    /^maserati (coupe|spyder|gransport)\b/,
    /^rolls-royce (wraith|dawn|spectre)\b/,
    /^aston martin (db\d*|dbs|vanquish|virage|rapide)\b/,
    /^maserati (granturismo|grancabrio)\b/,
    /^jaguar xk\w*\b/,
    /^ferrari (california|portofino|roma|gtc4|ff|612|456)\b/,
    /^polestar 1\b/,
  ],
  // Every supercar, by segment: a Huracán's rivals are an R8 and a 488.
  supercar: [(_name, car) => car.shoppingSegment === 'supercar'],
  'small-ev': [
    /^nissan leaf\b/,
    /^chevrolet (bolt(?! euv)|spark ev)\b/,
    /^bmw i3s?\b/,
    /^volkswagen e-golf\b/,
    /^hyundai (ioniq electric|kona electric)\b/,
    /^kia (niro ev|soul ev|niro electric)\b/,
    /^mini (cooper se|se hardtop|cooper e)\b/,
    /^fiat 500e\b/,
    /^ford focus electric\b/,
    /^mitsubishi i-miev\b/,
    /^mazda mx-30\b/,
    /^mercedes-benz (b-class electric|b250e)\b/,
  ],
  'ev-sedan': [
    /^tesla model (3|s)\b/,
    /^polestar 2\b/,
    /^hyundai ioniq 6\b/,
    /^bmw (i4|i5|i7)\b/,
    /^mercedes-benz (amg )?(eqe|eqs)(?!.*suv)/,
    /^audi ((s |rs )?e-tron gt|a6 e-tron|s6 e-tron)\b/,
    /^genesis electrified g80\b/,
    /^porsche taycan\b/,
    /^lucid air\b/,
    /^volkswagen id\.7\b/,
  ],
  'ev-suv': [
    /^tesla model (y|x)\b/,
    /^hyundai (ioniq 5|ioniq 9)\b/,
    /^kia (ev6|ev9|ev3)\b/,
    /^ford mustang mach-e\b/,
    /^volkswagen id\.4\b/,
    /^nissan ariya\b/,
    /^toyota (bz4x|bz)\b/,
    /^subaru solterra\b/,
    /^audi (q4|q6|q8)\b.*\be-tron\b/,
    /^audi (e-tron(?! gt)|q8 e-tron|sq8 e-tron)\b/,
    /^volvo (xc40 (recharge|electric|bev)|c40|ex30|ex40|ec40|ex90)\b/,
    /^chevrolet (bolt euv|blazer ev|equinox ev)\b/,
    /^cadillac (lyriq|optiq|vistiq)\b/,
    /^honda prologue\b/,
    /^acura zdx\b/,
    /^lexus (rz|ux 300e)\b/,
    /^bmw (ix|ix3)\b/,
    /^genesis (gv60|electrified gv70)\b/,
    /^mercedes-benz (amg )?(eqb|eqe.*suv|eqs.*suv)/,
    /^jaguar i-pace\b/,
    /^rivian r1s\b/,
    /^polestar (3|4)\b/,
    /^porsche macan electric\b/,
    /^fisker ocean\b/,
    /^lucid gravity\b/,
    /^rivian r[23]\b/,
    /^vinfast\b/,
    /^jeep wagoneer s\b/,
    /^subaru (uncharted|trailseeker)\b/,
  ],
  'ev-pickup': [
    /^ford f-?150 lightning\b/,
    /^rivian r1t\b/,
    /^chevrolet silverado ev\b/,
    /^gmc (hummer ev|sierra ev)\b/,
    /^tesla cybertruck\b/,
  ],
  minivan: [(_name, car) => car.bodyStyle === 'minivan', /^mazda 5\b/, /^ford freestar\b/],
  'compact-van': [
    /^ford transit connect\b/,
    /^nissan nv200\b/,
    /^(ram|dodge) promaster city\b/,
    /^chevrolet city express\b/,
    /^mercedes-benz metris\b/,
  ],
  'full-size-van': [
    /^ford (transit(?! connect)|e-?\d{3}|econoline)\b/,
    /^(chevrolet|gmc) (express|savana|van|g\d{2}|astro|safari)\b/,
    /^(ram|dodge) (promaster(?! city)|ram van|ram wagon)\b/,
    /^mercedes-benz sprinter\b/,
    /^nissan nv(?!200)\d*\b/,
    /^freightliner sprinter\b/,
  ],
  'family-coupe': [
    /^honda (accord|civic)\b.*\b(coupe|2dr)\b/,
    /^honda civic 2dr\b/,
    /^nissan (altima|sentra) coupe\b/,
    /^toyota (camry solara|solara)\b/,
    /^chevrolet (monte carlo|cobalt coupe|cavalier coupe)\b/,
    /^hyundai (tiburon|elantra coupe)\b/,
    /^kia forte koup\b/,
    /^chrysler (sebring|200) convertible\b/,
    /^volkswagen (eos|beetle convertible|new beetle convertible)\b/,
    /^pontiac g6\b.*\b(coupe|convertible|gt\/gtp)\b/,
    /^scion tc\b/,
    /^mercury cougar\b/,
    /^ford thunderbird\b/,
    /^buick cascada\b/,
    /^saturn sc\b/,
  ],
};

/**
 * Each member with the text a make must appear in for it to match: an
 * anchored pattern names its makes ("^(chevrolet|gmc) ...", "^mini ..."), so
 * a Camry is tested against the Toyota rows only. Predicates and unanchored
 * patterns are tested for every car.
 */
const MEMBERS: Array<{ set: CompetitiveSet; member: Member; hint: string | null }> = (
  Object.keys(SETS) as CompetitiveSet[]
).flatMap((set) =>
  SETS[set].map((member) => ({
    set,
    member,
    hint: typeof member !== 'function' && member.source.startsWith('^') ? member.source : null,
  })),
);

const membersByMake = new Map<string, typeof MEMBERS>();
function membersFor(make: string): typeof MEMBERS {
  let list = membersByMake.get(make);
  if (!list) {
    list = MEMBERS.filter(({ hint }) => !hint || hint.includes(make));
    membersByMake.set(make, list);
  }
  return list;
}

const cache = new Map<string, CompetitiveSet[]>();

/** The competitive sets a car belongs to (usually one, sometimes two, often none). */
export function competitiveSets(car: CarSpecs & { id?: string }): CompetitiveSet[] {
  const key =
    car.id ?? `${car.make}|${car.model}|${car.year}|${car.variant ?? ''}|${car.bodyStyle}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // "New Compass", "New Range Rover": EPA's names for a new generation.
  const name = `${car.make} ${car.model.replace(/^new /i, '')} ${car.variant ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const make = car.make.toLowerCase().split(' ')[0];
  const found = new Set<CompetitiveSet>();
  for (const { set, member } of membersFor(make)) {
    if (found.has(set)) continue;
    if (typeof member === 'function' ? member(name, car) : member.test(name)) found.add(set);
  }
  let sets = (Object.keys(SETS) as CompetitiveSet[]).filter((set) => found.has(set));
  // An S-Class or E-Class with two doors is a grand tourer, not a sedan's rival.
  if (car.bodyStyle === 'coupe' || car.bodyStyle === 'convertible') {
    const sedanSets: CompetitiveSet[] = ['flagship-sedan', 'midsize-luxury-car'];
    if (sets.some((s) => sedanSets.includes(s))) {
      sets = [...sets.filter((s) => !sedanSets.includes(s)), 'grand-tourer'];
    }
  }
  cache.set(key, sets);
  return sets;
}

/** One vehicle of each set, for the spec table: "Class: Compact SUV". */
export const COMPETITIVE_SET_LABELS: Record<CompetitiveSet, string> = {
  'subcompact-car': 'Subcompact car',
  'compact-car': 'Compact car',
  'sport-compact': 'Sport compact',
  'midsize-car': 'Midsize car',
  'large-car': 'Full-size car',
  'entry-luxury-car': 'Entry luxury car',
  'midsize-luxury-car': 'Midsize luxury car',
  'flagship-sedan': 'Flagship sedan',
  'subcompact-suv': 'Subcompact SUV',
  'compact-suv': 'Compact SUV',
  'midsize-suv': 'Midsize SUV',
  'three-row-suv': 'Three-row SUV',
  'full-size-suv': 'Full-size SUV',
  'off-roader': 'Off-roader',
  'subcompact-luxury-suv': 'Subcompact luxury SUV',
  'compact-luxury-suv': 'Compact luxury SUV',
  'midsize-luxury-suv': 'Midsize luxury SUV',
  'full-size-luxury-suv': 'Full-size luxury SUV',
  'compact-pickup': 'Compact pickup',
  'midsize-pickup': 'Midsize pickup',
  'full-size-pickup': 'Full-size pickup',
  'heavy-duty-pickup': 'Heavy-duty pickup',
  'pony-car': 'Pony car',
  'affordable-sports-car': 'Sports car',
  'premium-sports-car': 'Premium sports car',
  'grand-tourer': 'Grand tourer',
  supercar: 'Supercar',
  'small-ev': 'Small EV',
  'ev-sedan': 'Electric sedan',
  'ev-suv': 'Electric SUV',
  'ev-pickup': 'Electric pickup',
  minivan: 'Minivan',
  'compact-van': 'Compact van',
  'full-size-van': 'Full-size van',
  'family-coupe': 'Family coupe',
};

/**
 * Classes that qualify a size and price class rather than stand for one: a
 * G-Class is a full-size luxury SUV that is also an off-roader, a Model X a
 * midsize luxury SUV that is also electric.
 */
const QUALIFYING_SETS = new Set<CompetitiveSet>([
  'off-roader',
  'three-row-suv',
  'family-coupe',
  'small-ev',
  'ev-sedan',
  'ev-suv',
  'ev-pickup',
]);

/** Pairs where the second class adds nothing a reader needs ("Sports car · Premium sports car"). */
const REDUNDANT_PAIRS = new Set(['affordable-sports-car|premium-sports-car']);

function displayRank(set: CompetitiveSet, car: CarSpecs): number {
  // A Gladiator is an off-roader too, but it is shopped as a pickup.
  if (car.bodyStyle === 'truck' && set.endsWith('-pickup')) return 0;
  // A 918 Spyder is a supercar first.
  if (set === 'supercar') return 1;
  return QUALIFYING_SETS.has(set) ? 3 : 2;
}

/**
 * The classes a car is shopped in, for display: the size and price class
 * first, then one that qualifies it ("Full-size luxury SUV · Off-roader"). It
 * showed the first set alone, so a G-Class read "Off-roader".
 */
export function competitiveClassLabel(car: CarSpecs & { id?: string }): string | undefined {
  const sets = competitiveSets(car)
    .map((set, order) => ({ set, order, rank: displayRank(set, car) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ set }) => set);
  if (!sets.length) return undefined;
  const shown = sets.length > 1 && !REDUNDANT_PAIRS.has(`${sets[0]}|${sets[1]}`) ? 2 : 1;
  return sets
    .slice(0, shown)
    .map((set) => COMPETITIVE_SET_LABELS[set])
    .join(' · ');
}

/** True when two cars are cross-shopped: they share a competitive set. */
export function sharesCompetitiveSet(a: CarSpecs, b: CarSpecs): boolean {
  const setsA = competitiveSets(a);
  if (!setsA.length) return false;
  const setsB = competitiveSets(b);
  return setsA.some((s) => setsB.includes(s));
}
