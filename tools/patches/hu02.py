import re
# Translate discovery names / descriptions / wow titles by key, keeping all mechanics intact.
NAMES = {
  'fire_awareness': ('A tűz ismerete', 'Látott már tüzet, és megértette, hogy az birtokolható.', None),
  'clay_awareness': ('Az agyag ismerete', 'Tudja, hogy a víz menti puha föld formázható.', None),
  'foraging_lore': ('Növényismeret', 'Melyik növény táplál, melyik árt. Jobb gyűjtögetés.', 'Első növényismeret'),
  'stone_knapping': ('Kőszerszám', 'Kő a kőhöz ütve élt ad.', 'Első kőszerszám'),
  'fire_making': ('Tűzgyújtás', 'A tüzet nemcsak találni, csinálni is lehet.', 'Első tűz'),
  'cooking': ('Főzés', 'A tűz fölött a hús biztonságosabb, táplálóbb, tovább eláll.', 'Első főtt étel'),
  'shelter_building': ('Fedezéképítés', 'Egymásnak támasztott ágak kizárják az esőt és a szelet.', 'Első fedezék'),
  'fiber_twisting': ('Kötélfonás', 'A sodort növényi rost kötelet ad.', None),
  'basket_weaving': ('Kosárfonás', 'Többet vihetsz, többet gyűjthetsz.', 'Első kosár'),
  'spear_making': ('Lándzsakészítés', 'Éles kő egy nyélen. Megkezdődhet a vadászat.', 'Első lándzsa'),
  'fishing': ('Halászat', 'A víz tele van étellel annak, aki megtanulja kivenni.', 'Első fogás'),
  'woodworking': ('Famegmunkálás', 'Fa formázása kőszerszámmal.', None),
  'hut_construction': ('Kunyhóépítés', 'Igazi otthon: falak, tető, hely a holminak.', 'Első kunyhó'),
  'digging': ('Ásás', 'Ami a föld alatt van, elérhető.', None),
  'pottery': ('Fazekasság', 'A tűzben keményedett agyag vizet és gabonát tart.', 'Első agyagedény'),
  'food_drying': ('Tartósítás', 'A szárított étel kibírja a telet.', 'Első éléskamra'),
  'hide_working': ('Bőrmegmunkálás', 'Az állatbőrből meleg ruha lesz.', 'Első ruha'),
  'seed_planting': ('Földművelés', 'A földbe tett mag ételként tér vissza.', 'Első szántó'),
  'herbal_medicine': ('Gyógynövények', 'Néhány növény sebet zár és lázat csillapít.', 'Első gyógyító'),
  'stone_masonry': ('Kőművesség', 'Az agyaggal kötött, illesztett kő nemzedékeken át áll.', 'Első kőház'),
  'ore_lore_copper': ('A zöld kő ismerete', 'Furcsa, zölderes követ találtak. Még senki sem tudja, mire jó.', None),
  'ore_lore_tin': ('A szürke kő ismerete', 'Nehéz szürke kő. Használata ismeretlen.', None),
  'ore_lore_iron': ('A vörös kő ismerete', 'Rozsdavörös, nehéz, egyelőre haszontalan kő.', None),
  'ore_lore_coal': ('Az égő kő ismerete', 'Fekete kő, amely ég.', None),
  'ore_lore_gold': ('A fénylő kő ismerete', 'Puha sárga kő, amely sosem homályosul. Gyönyörű.', None),
}
def apply(s):
  for key, (name, desc, wow) in NAMES.items():
    m = re.search(r"    %s: \{(.*?)\},\n" % key, s)
    assert m, key
    block = m.group(0)
    nb = re.sub(r"name: '[^']*'", "name: '%s'" % name, block, count=1)
    nb = re.sub(r"desc: '[^']*'", "desc: '%s'" % desc, nb, count=1)
    if wow: nb = re.sub(r"wow: '[^']*'", "wow: '%s'" % wow, nb, count=1)
    s = s.replace(block, nb)
  return s
PATCHES = []
import io, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = os.path.join(ROOT, 'src', 'tech', 'discoveries.js'); s = open(p, encoding='utf-8').read(); s2 = apply(s)
assert s2 != s
open(p, 'w', encoding='utf-8').write(s2); print('discoveries translated')
