-- Add German descriptions for all 12 active units (core_units.description_de)
-- Date: 2026-09-26
-- Purpose: Populate description_de for the /de/* site (i18n phase 3).
--          Unlike description_en, this column does NOT exist yet, so the
--          migration creates it first. The frontend selects description_de
--          (src/data/units.js), so this migration MUST be applied BEFORE
--          deploying the frontend, otherwise the unit queries fail.
--          Frontend falls back to the Spanish description when
--          description_de is null/empty.

ALTER TABLE core_units ADD COLUMN IF NOT EXISTS description_de text;

UPDATE core_units SET description_de = $$Die Cabaña Chilco bietet eine warme, familienfreundliche Unterkunft für 5 Gäste mit zwei gut aufgeteilten Schlafzimmern, einer voll ausgestatteten Küche, Zentralheizung, Satelliten-TV, WLAN und privatem Parkplatz. Nur 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, ist sie ein hervorragender Ausgangspunkt, um die Umgebung zu erkunden und in patagonischer Landschaft zu entspannen.$$ WHERE id = '9a95daab-f318-4835-b701-f6ea88bc114d';

UPDATE core_units SET description_de = $$Die Cabaña Ciruelillo ist eine geräumige, komfortable Option für bis zu 6 Gäste mit drei Schlafzimmern: einem Hauptschlafzimmer mit Kingsize-Bett und zwei weiteren Zimmern mit je zwei Einzelbetten. Nur 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, bietet sie eine voll ausgestattete Küche, Zentralheizung, Satelliten-TV, WLAN und einen privaten Parkplatz. Ideal für große Familien oder Freundesgruppen, die Natur und Erholung in der Nähe des Torres del Paine suchen.$$ WHERE id = 'f3fb1be8-cd83-4a5d-b340-8fd83421bd58';

UPDATE core_units SET description_de = $$Die Cabaña Flor de Notro bietet eine gemütliche, komfortable Unterkunft für 4 Gäste mit einem Hauptschlafzimmer mit Kingsize-Bett und einem zweiten Schlafzimmer mit zwei großen Einzelbetten. Im Komplex Arte Brisa Patagonia, 5 km von Puerto Natales entfernt, verfügt sie über eine ausgestattete Küche, Zentralheizung, Satelliten-TV, WLAN und einen privaten Parkplatz – perfekt zum Entspannen nach Ausflügen durch Patagonien und den Nationalpark Torres del Paine.$$ WHERE id = '13a700ab-f974-46ac-b39b-edbec4c5484d';

UPDATE core_units SET description_de = $$Eine helle, gemütliche Hütte für bis zu 5 Gäste mit einem Hauptschlafzimmer mit Kingsize-Bett und einem Loft mit drei Einzelbetten. 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, verfügt sie über eine ausgestattete Küche, eine Waschmaschine, Zentralheizung, Satelliten-TV, WLAN und einen privaten Parkplatz. Ideal für Familien oder Freunde, die Ruhe und Natur in der Nähe des Torres del Paine suchen.$$ WHERE id = '4703fcf0-4788-421a-8ad7-a800fb99f9c6';

UPDATE core_units SET description_de = $$Dieses Erdgeschoss-Apartment bietet Platz für bis zu 5 Gäste in zwei Schlafzimmern: einem mit Doppelbett und Einzelbett und einem zweiten mit zwei Betten. Es verfügt über Zentralheizung, Satelliten-TV und WLAN. Ein komfortabler, familienfreundlicher Ort, ideal zum Ausruhen nach einem Tag voller Entdeckungen in Puerto Natales und Patagonien.$$ WHERE id = '44f79162-6c35-47bb-83ef-36d988ebb83f';

UPDATE core_units SET description_de = $$Dieses Apartment für 3 Gäste liegt im Zentrum von Puerto Natales und bietet ein Schlafzimmer mit Doppelbett und Einzelbett sowie Zentralheizung, Satelliten-TV und WLAN. Perfekt für Paare oder kleine Familien, die Komfort, eine großartige Lage und einen warmen Ort zum Auftanken nach ihren Ausflügen suchen.$$ WHERE id = '0cb4ab96-08e8-4337-b3c2-10717cf68e77';

UPDATE core_units SET description_de = $$Dieses Apartment für 4 Gäste verfügt über zwei Schlafzimmer (eines mit Doppelbett, das andere mit zwei Einzelbetten), eine ausgestattete Küche, Zentralheizung, Satelliten-TV und WLAN. Nur wenige Blocks vom Busbahnhof entfernt und in der Nähe von Supermärkten, ist es ein praktischer, gut gelegener Ausgangspunkt, um Puerto Natales zu erkunden und in Richtung Torres del Paine aufzubrechen.$$ WHERE id = '128ca3e0-99a8-4d9c-becb-99edbb93acec';

UPDATE core_units SET description_de = $$Ein geräumiges, helles Apartment im Obergeschoss für bis zu 5 Gäste mit zwei Schlafzimmern (eines mit Doppelbett, das andere mit zwei Einzelbetten) und einem Schlafsofa im Wohnzimmer. Es bietet eine voll ausgestattete Küche, Zentralheizung, Satelliten-TV und WLAN – ideal für Familien oder Gruppen, die Komfort und eine großartige Lage in Puerto Natales suchen.$$ WHERE id = '32babfdf-5c5f-4a1f-a23b-61ac6da56798';

UPDATE core_units SET description_de = $$Das Tiny House Calafate ist ein gemütliches Studio für Paare mit Doppelbett, kompakter Küche, eigenem Bad und Zentralheizung. Im Komplex Arte Brisa Patagonia, 5 km von Puerto Natales entfernt, lädt es dazu ein abzuschalten, mit Bergblick aufzuwachen und die Stille des chilenischen Südens zu genießen, nachdem Sie die Umgebung und den Torres del Paine erkundet haben.$$ WHERE id = 'e72e822f-cc4a-48b6-9f76-f8485eac68aa';

UPDATE core_units SET description_de = $$Das Tiny House Margarita ist ein gemütlicher Rückzugsort für 2 Gäste, ideal für Paare, die Erholung und Privatsphäre im Herzen Patagoniens suchen. Nur 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, bietet dieses Studio ein Doppelbett, eine kleine Küche, ein eigenes Bad und Zentralheizung – perfekt zum Entspannen inmitten der Natur und mit Bergblick.$$ WHERE id = 'e5b784ee-e87f-497c-abd1-cda1352d6806';

UPDATE core_units SET description_de = $$Das Tiny House Ñirre bietet einen gemütlichen Raum für 2 Gäste, ideal für Paare, die Ruhe und Natur im Herzen Patagoniens suchen. Nur 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, verfügt dieses Studio über ein Doppelbett, eine kleine Küche, ein eigenes Bad und Zentralheizung – perfekt zum Ausruhen und Abschalten mit Bergblick.$$ WHERE id = '2e4145b0-6cbe-42fb-9bbf-f49f286ec1d1';

UPDATE core_units SET description_de = $$Das Tiny House Violeta ist ein gemütlicher Rückzugsort für 2 Gäste, ideal für Paare, die Erholung und Ruhe im Herzen Patagoniens suchen. Nur 5 km von Puerto Natales entfernt, im Komplex Arte Brisa Patagonia gelegen, ist dieses Studio mit einem Doppelbett, einer kleinen Küche, einem eigenen Bad und Zentralheizung ausgestattet – perfekt zum Entspannen und Genießen der Natur ringsum.$$ WHERE id = 'f3177f46-35cd-4d47-85ae-f7ca98d24a7b';
