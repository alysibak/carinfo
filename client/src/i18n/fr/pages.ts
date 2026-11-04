/** The landing page, methodology and the not-found page. English text to French (fr-CA). */
const fr: Record<string, string> = {
  // Landing
  'Skip to content': 'Aller au contenu',
  'Public records, in plain words': 'Des documents publics, en mots simples',
  'Compare cars with facts you can check': 'Comparez les véhicules avec des faits vérifiables',
  'Look up 35,000+ versions of cars since 1995: fuel use and range from official EPA tests, NHTSA crash ratings when on file, and rated power, in Canadian units, each marked with its source.':
    'Consultez plus de 35\u00a0000 versions de véhicules depuis 1995\u00a0: consommation et autonomie selon les essais officiels de l’EPA, cotes de sécurité de la NHTSA lorsqu’elles sont au dossier, et puissance nominale, en unités canadiennes, chacune indiquant sa source.',
  'Fuel use and range from official EPA tests and crash-test stars from NHTSA, in litres and kilometres. Every figure says where it came from, and anything we estimate, like a car’s value, is marked as an estimate.':
    'Consommation et autonomie selon les essais officiels de l’EPA, et étoiles d’essais de collision de la NHTSA, en litres et en kilomètres. Chaque chiffre indique d’où il vient, et tout ce que nous estimons, comme la valeur d’un véhicule, est marqué comme une estimation.',
  'Make, model, or VIN': 'Marque, modèle ou NIV',
  'A 17-character VIN works too.': 'Un NIV de 17 caractères fonctionne aussi.',
  'Not sure yet? Start from what you need →':
    'Pas encore sûr\u00a0? Partez de ce dont vous avez besoin →',
  'How do you want to start?': 'Comment voulez-vous commencer\u00a0?',
  'I know the car': 'Je connais le véhicule',
  'Search its make, model or year': 'Recherchez sa marque, son modèle ou son année',
  'I’m still deciding': 'Je n’ai pas encore décidé',
  'Start from what you need it for: commuting, a family, a first car':
    'Partez de l’usage prévu\u00a0: les déplacements, une famille, une première voiture',
  'Safety first': 'La sécurité d’abord',
  'Five crash-test stars, collision warning, no recalls':
    'Cinq étoiles aux essais de collision, avertissement de collision, aucun rappel',
  'I have a VIN': 'J’ai un NIV',
  'What it is, and its year’s recalls, complaints and crash rating':
    'Ce que c’est, et les rappels, plaintes et cote de sécurité de son année',
  'I’m comparing options': 'Je compare des options',
  'Popular match-ups side by side in one tap, or any cars you pick':
    'Des duels populaires côte à côte en un toucher, ou les véhicules de votre choix',
  'The whole market': 'Tout le marché',
  'Every car’s value against its fuel use': 'La valeur de chaque véhicule face à sa consommation',
  Shortlists: 'Listes sélectionnées',
  'Ranked picks for common situations, one per model, not every trim on file.':
    'Des choix classés pour des situations courantes, un par modèle, pas chaque finition au dossier.',
  'All {count} shortlists →': 'Les {count} listes sélectionnées →',
  'Page not found': 'Page introuvable',
  'This CarInfo page does not exist.': 'Cette page CarInfo n’existe pas.',
  'The address may be mistyped, or the page has moved. Search for the car instead.':
    'L’adresse est peut-être mal saisie, ou la page a déménagé. Cherchez plutôt le véhicule.',
  'Start from what you need': 'Partez de ce dont vous avez besoin',
  'Look up a VIN': 'Chercher un NIV',

  // Methodology
  'How CarInfo loads EPA data, corrects PHEV mislabels, enriches specs at runtime, and estimates Canadian market value by province with stated confidence.':
    'Comment CarInfo charge les données de l’EPA, corrige les hybrides rechargeables mal classés, enrichit les fiches à l’exécution et estime la valeur marchande canadienne par province avec un niveau de confiance indiqué.',
  'Where the figures come from': 'D’où viennent les chiffres',
  'CarInfo puts public records about cars in one place: EPA’s fuel ratings, NHTSA’s crash tests, complaints and investigations, Transport Canada’s recalls and measurements, and Équité’s theft counts. Each figure says where it came from. The few we estimate, such as a car’s value, are marked as estimates, with how we made them.':
    'CarInfo réunit en un seul endroit des documents publics sur les véhicules\u00a0: les cotes de consommation de l’EPA, les essais de collision, plaintes et enquêtes de la NHTSA, les rappels et mesures de Transports Canada, et les comptes de vols d’Équité. Chaque chiffre indique d’où il vient. Les rares que nous estimons, comme la valeur d’un véhicule, sont marqués comme estimations, avec la façon dont nous les avons faites.',
  Sources: 'Sources',
  'Each fact on the site comes from one of these, and keeps the identifier its source knows it by (an EPA vehicle id, a Transport Canada recall number), so it can be looked up there.':
    'Chaque fait sur le site vient de l’une de celles-ci et conserve l’identifiant sous lequel sa source le connaît (un id de véhicule EPA, un numéro de rappel de Transports Canada), afin qu’on puisse le retrouver là.',
  'fuel use and EV range, engines and gearboxes, CO₂ and greenhouse rating, trunk and passenger space.':
    'consommation et autonomie des VE, moteurs et boîtes de vitesses, cote de CO₂ et d’effet de serre, espace de coffre et pour les passagers.',
  'U.S. government data, public domain.': 'Données du gouvernement des É.-U., domaine public.',
  'the cars sold in Canada that EPA never rated.':
    'les véhicules vendus au Canada que l’EPA n’a jamais cotés.',
  'Open Government Licence – Canada.': 'Licence du gouvernement ouvert – Canada.',
  'crash-test stars, rollover risk and the safety technology listed, from each model year since 2011 that NHTSA tested in the car’s body and drivetrain.':
    'étoiles d’essai de collision, risque de retournement et technologies de sécurité listées, pour chaque année modèle depuis 2011 que la NHTSA a testée dans la carrosserie et la transmission du véhicule.',
  'owner complaints by model year and part: owners’ reports, not confirmed defects, not adjusted for sales.':
    'plaintes des propriétaires par année modèle et pièce\u00a0: rapports des propriétaires, pas des défauts confirmés, non ajustés selon les ventes.',
  'the defect investigations covering each model year, with NHTSA’s number, dates and the recall each led to: an investigation is not a finding that the defect exists.':
    'les enquêtes sur les défauts visant chaque année modèle, avec le numéro de la NHTSA, les dates et le rappel auquel chacune a mené\u00a0: une enquête n’est pas une conclusion que le défaut existe.',
  'length, width without mirrors, height, wheelbase and curb weight, as Transport Canada measured each version of a model year.':
    'longueur, largeur sans rétroviseurs, hauteur, empattement et masse à vide, tels que Transports Canada les a mesurés pour chaque version d’une année modèle.',
  'Government data, published openly through vPIC.':
    'Données gouvernementales, publiées ouvertement via vPIC.',
  'recalls in Canada by model year, with Transport Canada’s recall number and its notice.':
    'rappels au Canada par année modèle, avec le numéro de rappel de Transports Canada et son avis.',
  'the pump prices fuel costs are figured at: the region’s city’s self-serve regular, premium and diesel, averaged over the last twelve months.':
    'les prix à la pompe auxquels les coûts de carburant sont calculés\u00a0: essence ordinaire, super et diesel en libre-service de la ville de la région, moyennés sur les douze derniers mois.',
  'Statistics Canada Open Licence.': 'Licence ouverte de Statistique Canada.',
  'where a model stands among the ten stolen most in Canada in the latest year counted: a count, so models with many on the road rank higher.':
    'où se situe un modèle parmi les dix les plus volés au Canada pour la dernière année comptée\u00a0: un décompte, donc les modèles nombreux sur la route se classent plus haut.',
  'Published by Équité, the insurance industry’s body for fraud and crime; ranks only.':
    'Publié par Équité, l’organisme de l’industrie de l’assurance pour la fraude et le crime\u00a0; classements seulement.',
  'photos of a car’s own model year, on request.':
    'photos de l’année modèle propre du véhicule, sur demande.',
  'Each under its own free licence, credited beside it.':
    'Chacune sous sa propre licence libre, créditée à côté.',
  'The government files are downloaded weekly on GitHub (the public-data job), matched to the site’s models and reviewed before they reach a page. A government record the site cannot match to one of its models, such as a heavy-duty pickup EPA does not rate, is left out rather than counted against a model it is not.':
    'Les fichiers gouvernementaux sont téléchargés chaque semaine sur GitHub (la tâche public-data), appariés aux modèles du site et examinés avant d’atteindre une page. Un dossier gouvernemental que le site ne peut apparier à l’un de ses modèles, comme une camionnette lourde que l’EPA ne cote pas, est laissé de côté plutôt que compté contre un modèle qu’il n’est pas.',
  'How a car’s page is put together': 'Comment la page d’un véhicule est assemblée',
  '<0>The cars</0>: every version EPA has rated from {from} to {to}, about 36,000, and the cars sold in Canada that EPA never rated (an Acura CSX, a Chevrolet Orlando, a Kia Magentis), from Natural Resources Canada and marked NRCan.':
    '<0>Les véhicules</0>\u00a0: chaque version cotée par l’EPA de {from} à {to}, environ 36\u00a0000, et les véhicules vendus au Canada que l’EPA n’a jamais cotés (une Acura CSX, une Chevrolet Orlando, une Kia Magentis), provenant de Ressources naturelles Canada et marqués NRCan.',
  '<0>The records matched to each</0>: NHTSA’s crash ratings for the same model year, body and drivetrain, Transport Canada’s measurements and recalls, owner complaints, defect investigations and the theft list. The site reads its own copies, so a page never waits on a government server.':
    '<0>Les dossiers appariés à chacun</0>\u00a0: les cotes de sécurité de la NHTSA pour la même année modèle, carrosserie et transmission, les mesures et rappels de Transports Canada, les plaintes des propriétaires, les enquêtes sur les défauts et la liste des vols. Le site lit ses propres copies, de sorte qu’une page n’attend jamais un serveur gouvernemental.',
  '<0>Names and bodies made plain</0>: trims EPA leaves out of the model name (a Mustang GT is just “Mustang”, a 2019 Civic Type R a “Civic 5Dr”) are named from the engine and gearbox, and marked as estimated. Body styles follow the doors, not EPA’s size class: a Boxster is a convertible, a BMW Gran Coupe a sedan and a GLE Coupe an SUV. Similar cars come from the classes shoppers compare within, so a Camry’s are an Accord and a Sonata rather than a Civic at the same price.':
    '<0>Noms et carrosseries clarifiés</0>\u00a0: les finitions que l’EPA omet du nom du modèle (une Mustang GT n’est que «\u00a0Mustang\u00a0», une Civic Type R 2019 une «\u00a0Civic 5Dr\u00a0») sont nommées d’après le moteur et la boîte, et marquées comme estimées. Les styles de carrosserie suivent les portes, pas la classe de taille de l’EPA\u00a0: une Boxster est une décapotable, une BMW Gran Coupe une berline et une GLE Coupe un VUS. Les véhicules semblables viennent des classes que comparent les acheteurs, ainsi ceux d’une Camry sont une Accord et une Sonata plutôt qu’une Civic au même prix.',
  '<0>Each figure keeps its source</0>, which the page names beside it (see what the labels mean, below).':
    '<0>Chaque chiffre garde sa source</0>, que la page nomme à côté (voir ce que signifient les étiquettes, ci-dessous).',
  'Plug-in hybrids filed as electric': 'Hybrides rechargeables classés comme électriques',
  'EPA’s bulk file lists some plug-in hybrids among its electric cars. Each car’s fuel type is read again from EPA’s own fields for it when the data is built, and checked once more by name (Volt, Prius Prime, T8, 4xe) and by a gas engine with a short electric range (under 80 km), so a plug-in hybrid is not shown as electric. Automated tests hold both checks in place.':
    'Le fichier groupé de l’EPA range certains hybrides rechargeables parmi ses véhicules électriques. Le type de carburant de chaque véhicule est relu dans les propres champs de l’EPA au moment de la construction des données, puis revérifié par le nom (Volt, Prius Prime, T8, 4xe) et par un moteur à essence avec une courte autonomie électrique (moins de 80 km), afin qu’un hybride rechargeable ne soit pas présenté comme électrique. Des tests automatisés maintiennent les deux contrôles en place.',
  'How we estimate value and running costs':
    'Comment nous estimons la valeur et les coûts d’utilisation',
  'Value, running costs, resale and the five-year cost are <0>always estimates</0>, in Canadian dollars for the province or region you pick — ten on file (ON, BC, AB, QC, MB, SK, NS, NB, PE, NL), each with its own yearly kilometres, fuel and insurance. They are not listing prices, and never shown as a maker’s price.':
    'La valeur, les coûts d’utilisation, la revente et le coût sur cinq ans sont <0>toujours des estimations</0>, en dollars canadiens pour la province ou la région que vous choisissez — dix au dossier (ON, BC, AB, QC, MB, SK, NS, NB, PE, NL), chacune avec ses kilomètres annuels, son carburant et son assurance. Ce ne sont pas des prix d’annonce, et jamais présentés comme le prix d’un fabricant.',
  'Value starts from a typical current US sticker price for the vehicle’s model, maker or size class, converted at the ratio of Canadian to US sticker prices (about 1.2, not the exchange rate), then depreciated by age.':
    'La valeur part d’un prix d’affiche américain courant typique pour le modèle, le fabricant ou la classe de taille du véhicule, converti au ratio des prix d’affiche canadiens aux américains (environ 1,2, pas le taux de change), puis déprécié selon l’âge.',
  'Checked against average Canadian asking prices for 61 reference vehicles, from compacts to pickups, performance cars, supercars, plug-in hybrids and EVs; expect individual estimates to be within about 25%.':
    'Vérifiée par rapport aux prix demandés canadiens moyens pour 61 véhicules de référence, des compactes aux camionnettes, voitures de performance, supercars, hybrides rechargeables et VE\u00a0; attendez-vous à ce que les estimations individuelles se situent à environ 25\u00a0%.',
  'For everyday cars, SUVs and minivans the make matters from about three years on: a seven-year-old Honda or Toyota keeps far more of its price than a Ford, Chevrolet or Nissan of the same size.':
    'Pour les voitures de tous les jours, les VUS et les fourgonnettes, la marque compte à partir d’environ trois ans\u00a0: une Honda ou une Toyota de sept ans conserve bien plus de son prix qu’une Ford, une Chevrolet ou une Nissan de la même taille.',
  'Pickups depreciate on their own curve, mid-size pickups more gently than full-size, and models known to hold value (Tacoma, 4Runner, RAV4 Prime) more gently still.':
    'Les camionnettes se déprécient selon leur propre courbe, les camionnettes intermédiaires plus doucement que les pleine grandeur, et les modèles connus pour garder leur valeur (Tacoma, 4Runner, RAV4 Prime) encore plus doucement.',
  'Performance versions EPA lists under the base model’s name (a Mustang GT, a Camaro ZL1, a Civic Type R) are priced by their engine, and cars known to hold value unusually well are depreciated more gently.':
    'Les versions de performance que l’EPA range sous le nom du modèle de base (une Mustang GT, une Camaro ZL1, une Civic Type R) sont tarifées selon leur moteur, et les véhicules connus pour garder leur valeur exceptionnellement bien sont dépréciés plus doucement.',
  'Flagship sedans, big luxury SUVs and Range Rovers lose value fastest: priced new like other luxury cars, but by eight years a Mercedes S-Class or BMW 7 Series keeps about 60% of what a C-Class or 3 Series does. A Lexus or a new-generation Defender keeps far more. Canadian listings for these makes run about 1.2 times US ones, and the model is fitted at that ratio.':
    'Les berlines phares, les grands VUS de luxe et les Range Rover perdent leur valeur le plus vite\u00a0: tarifés neufs comme d’autres voitures de luxe, mais à huit ans une Mercedes Classe S ou une BMW Série 7 conserve environ 60\u00a0% de ce qu’une Classe C ou une Série 3 conserve. Une Lexus ou un Defender de nouvelle génération en conserve bien plus. Les annonces canadiennes pour ces marques tournent autour de 1,2 fois les américaines, et le modèle est ajusté à ce ratio.',
  'Supercars (a Ferrari, a Lamborghini, an R8) keep most of their price for a decade, while ultra-luxury cars and Maseratis lose most of theirs: a nine-year-old Huracán lists near 80% of today’s sticker, a Bentayga near 30%. Each follows its own curve, and values stay at medium confidence at best, since options and history move these prices more than age.':
    'Les supercars (une Ferrari, une Lamborghini, une R8) gardent l’essentiel de leur prix pendant une décennie, tandis que les voitures ultra-luxe et les Maserati perdent l’essentiel du leur\u00a0: une Huracán de neuf ans s’annonce près de 80\u00a0% du prix d’affiche d’aujourd’hui, une Bentayga près de 30\u00a0%. Chacune suit sa propre courbe, et les valeurs restent au mieux à une confiance moyenne, car les options et l’historique font plus bouger ces prix que l’âge.',
  'Collector cars are not valued: a first-generation NSX, a Supra Turbo, an air-cooled 911, a Lancer Evolution, a Viper, a limited-run hypercar or a Ferrari over twenty trades on auction results and condition, and is often worth more than when new.':
    'Les voitures de collection ne sont pas évaluées\u00a0: une NSX de première génération, une Supra Turbo, une 911 à refroidissement par air, une Lancer Evolution, une Viper, une hypercar en série limitée ou une Ferrari de plus de vingt ans se négocient selon les résultats d’enchères et l’état, et valent souvent plus que neuves.',
  'Nor are cars never sold to the public: the leased EV1 and Fit EV, the fuel-cell Clarity and Tucson, fleet cars such as the BYD e6 and Motional’s robotaxi, and the Postal Service’s Explorers. With no used market, a depreciation figure would be a price nobody can pay.':
    'Ni les véhicules jamais vendus au public\u00a0: l’EV1 et la Fit EV en location, la Clarity et le Tucson à pile à combustible, les véhicules de flotte comme la BYD e6 et le robotaxi de Motional, et les Explorer du service postal. Sans marché de l’occasion, un chiffre de dépréciation serait un prix que personne ne peut payer.',
  'Depreciation curves by segment, age and fuel type. Electric cars follow one curve fitted to Canadian listings (about half the sticker at five years), with a steeper discount for early short-range models; battery health widens the range rather than lowering the average, since listing prices already reflect typical wear.':
    'Courbes de dépréciation par segment, âge et type de carburant. Les véhicules électriques suivent une courbe ajustée aux annonces canadiennes (environ la moitié du prix d’affiche à cinq ans), avec une décote plus forte pour les premiers modèles à courte autonomie\u00a0; l’état de la batterie élargit la fourchette plutôt que d’abaisser la moyenne, car les prix d’annonce reflètent déjà l’usure typique.',
  'Insurance starts from each province’s average premium (FSRA in Ontario, ICBC in B.C., private markets in Alberta, SAAQ plus private collision in Quebec, and private markets in the Prairies and Atlantic provinces), then scales with body style, luxury make, value and age: above $30,000 of value it rises 0.4% for each $1,000, since collision and comprehensive cover grow with the car’s worth. Teslas and other premium EVs cost about a quarter more to insure for their repair costs. Your own quote depends on your record and postal code far more than on the car.':
    'L’assurance part de la prime moyenne de chaque province (FSRA en Ontario, ICBC en C.-B., marchés privés en Alberta, SAAQ plus collision privée au Québec, et marchés privés dans les Prairies et les provinces de l’Atlantique), puis s’ajuste selon le style de carrosserie, la marque de luxe, la valeur et l’âge\u00a0: au-dessus de 30\u00a0000\u00a0$ de valeur, elle augmente de 0,4\u00a0% par tranche de 1\u00a0000\u00a0$, car la collision et tous risques croissent avec la valeur du véhicule. Les Tesla et autres VE premium coûtent environ un quart de plus à assurer en raison de leurs coûts de réparation. Votre propre soumission dépend bien plus de votre dossier et de votre code postal que du véhicule.',
  'Maintenance and tires follow AAA and CAA driving-cost studies, by fuel type and age; exotics (a Ferrari, a Rolls-Royce, a Bentley) cost about $4,000 a year to service and wear through performance tires. Each region has its own registration fee — Ontario $0 (since 2022), B.C. ~$61 by weight, Alberta ~$94, Quebec ~$230, Manitoba $119, Saskatchewan $68, and similar fees in the Atlantic provinces.':
    'L’entretien et les pneus suivent les études de coûts de conduite de l’AAA et de la CAA, selon le type de carburant et l’âge\u00a0; les exotiques (une Ferrari, une Rolls-Royce, une Bentley) coûtent environ 4\u00a0000\u00a0$ par année à entretenir et usent des pneus de performance. Chaque région a ses propres droits d’immatriculation — Ontario 0\u00a0$ (depuis 2022), C.-B. ~61\u00a0$ selon le poids, Alberta ~94\u00a0$, Québec ~230\u00a0$, Manitoba 119\u00a0$, Saskatchewan 68\u00a0$, et des droits semblables dans les provinces de l’Atlantique.',
  'Energy costs from your region’s gas, diesel and home-electricity prices (recent Statistics Canada averages). Hydrogen uses B.C.’s posted pump price (about $16.50/kg); the other regions on file post none, so a fuel-cell car’s fuel is left out there rather than shown as free. Natural gas uses EPA’s own annual fuel-cost figure, converted to CAD.':
    'Les coûts d’énergie selon les prix de l’essence, du diesel et de l’électricité résidentielle de votre région (moyennes récentes de Statistique Canada). L’hydrogène utilise le prix à la pompe affiché en C.-B. (environ 16,50\u00a0$/kg)\u00a0; les autres régions au dossier n’en affichent aucun, donc le carburant d’un véhicule à pile à combustible y est omis plutôt que montré comme gratuit. Le gaz naturel utilise le chiffre annuel de coût de carburant de l’EPA, converti en dollars canadiens.',
  'Each estimate is a range, low to high with a middle figure, and says how confident it is (low, medium or high): how well the car fits the data the estimate is drawn from, not how close a dealer’s quote will be.':
    'Chaque estimation est une fourchette, du bas au haut avec un chiffre médian, et indique son niveau de confiance (faible, moyen ou élevé)\u00a0: à quel point le véhicule correspond aux données dont l’estimation est tirée, et non à quel point la soumission d’un concessionnaire sera proche.',
  'What the labels mean': 'Ce que signifient les étiquettes',
  'Beside each figure, where it came from:': 'À côté de chaque chiffre, d’où il vient\u00a0:',
  'Measured in EPA’s tests: fuel use, range, engine and emissions.':
    'Mesuré dans les essais de l’EPA\u00a0: consommation, autonomie, moteur et émissions.',
  'NHTSA’s crash-test stars for the car’s own model year, body and drivetrain (about 9,800 cars from 2011 on).':
    'Étoiles d’essai de collision de la NHTSA pour l’année modèle, la carrosserie et la transmission propres du véhicule (environ 9\u00a0800 véhicules depuis 2011).',
  'Horsepower as rated: by EPA’s test car, or by the maker where the test car had another engine (together about 70% of versions).':
    'Puissance telle que cotée\u00a0: par le véhicule d’essai de l’EPA, ou par le fabricant lorsque le véhicule d’essai avait un autre moteur (ensemble environ 70\u00a0% des versions).',
  'Our estimates: value, running and five-year costs, predicted 0–60 mph times, and horsepower taken from the same engine in the same model (about 16% of versions).':
    'Nos estimations\u00a0: valeur, coûts d’utilisation et sur cinq ans, temps 0–60 mi/h prédits, et puissance tirée du même moteur dans le même modèle (environ 16\u00a0% des versions).',
  Photos: 'Photos',
  'A car’s page and its model’s open with a photo from Wikimedia Commons of that model year, make, model and body. Where Commons has none, a photo of another year of the same generation says which year it is; where it has neither, an outline of the body stands in. Each photo names its photographer and licence. Search results show the outline only. No dealer or press photos: this is a reference, not a classifieds site.':
    'La page d’un véhicule et celle de son modèle s’ouvrent sur une photo de Wikimedia Commons de cette année modèle, marque, modèle et carrosserie. Lorsque Commons n’en a aucune, une photo d’une autre année de la même génération indique de quelle année il s’agit\u00a0; lorsqu’il n’a ni l’une ni l’autre, une silhouette de la carrosserie tient lieu. Chaque photo nomme son photographe et sa licence. Les résultats de recherche n’affichent que la silhouette. Pas de photos de concessionnaire ni de presse\u00a0: c’est une référence, pas un site de petites annonces.',
  'What we leave out': 'Ce que nous laissons de côté',
  'Torque, measured 0–60 times and equipment (heated seats, CarPlay) are in none of these sources. EPA gives interior space for cars and some SUVs, not pickups, and about one version in seven has no horsepower on file. A figure that is missing is left off the car’s page, and dropped from Compare when no car there has it; Compare says “Not on file” only where some cars have it and others do not. We would rather leave a figure out than make one up.':
    'Le couple, les temps 0–60 mesurés et l’équipement (sièges chauffants, CarPlay) ne figurent dans aucune de ces sources. L’EPA donne l’espace intérieur pour les voitures et certains VUS, pas les camionnettes, et environ une version sur sept n’a aucune puissance au dossier. Un chiffre manquant est omis de la page du véhicule, et retiré de Comparer lorsqu’aucun véhicule là n’en a\u00a0; Comparer n’affiche «\u00a0Absent du dossier\u00a0» que lorsque certains en ont et d’autres non. Nous préférons omettre un chiffre plutôt que d’en inventer un.',
};

export default fr;
