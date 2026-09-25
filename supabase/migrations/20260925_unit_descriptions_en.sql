-- Add English descriptions for all 12 active units (core_units.description_en)
-- Date: 2026-09-25
-- Purpose: Populate description_en for the /en/* site (i18n phase 2). The
--          column already exists in production; this migration only fills
--          its content. Frontend already falls back to Spanish description
--          when description_en is null, so this is safe to run at any time.

UPDATE core_units SET description_en = $$Cabaña Chilco offers a warm, family-friendly setting for 5 guests, with two well-laid-out bedrooms, an equipped kitchen, central heating, satellite TV, Wi-Fi, and private parking. Located just 5 km from Puerto Natales within the Arte Brisa Patagonia complex, it is an excellent base for exploring the area and unwinding amid Patagonian scenery.$$ WHERE id = '9a95daab-f318-4835-b701-f6ea88bc114d';

UPDATE core_units SET description_en = $$Cabaña Ciruelillo is a spacious, comfortable option for up to 6 guests, with three bedrooms: a master with a king-size bed and two additional rooms with two single beds each. Located just 5 km from Puerto Natales within the Arte Brisa Patagonia complex, it offers a fully equipped kitchen, central heating, satellite TV, Wi-Fi, and private parking. It is ideal for large families or groups of friends seeking nature and relaxation near Torres del Paine.$$ WHERE id = 'f3fb1be8-cd83-4a5d-b340-8fd83421bd58';

UPDATE core_units SET description_en = $$Cabaña Flor de Notro offers an intimate, comfortable setting for 4 guests, with a master bedroom with a king-size bed and a second bedroom with two large single beds. Located within the Arte Brisa Patagonia complex, 5 km from Puerto Natales, it has an equipped kitchen, central heating, satellite TV, Wi-Fi, and private parking—perfect for unwinding after exploring Patagonia and Torres del Paine National Park.$$ WHERE id = '13a700ab-f974-46ac-b39b-edbec4c5484d';

UPDATE core_units SET description_en = $$A bright, cozy cabin for up to 5 guests, featuring a master bedroom with a king-size bed and a loft with three single beds. Located 5 km from Puerto Natales within the Arte Brisa Patagonia complex, it comes with an equipped kitchen, a washing machine, central heating, satellite TV, Wi-Fi, and private parking. It is ideal for families or friends seeking peace and nature near Torres del Paine.$$ WHERE id = '4703fcf0-4788-421a-8ad7-a800fb99f9c6';

UPDATE core_units SET description_en = $$This ground-floor apartment sleeps up to 5 guests in two bedrooms: one with a double bed and a single bed, and a second with two beds. It has central heating, satellite TV, and Wi-Fi. A comfortable, family-friendly space, ideal for resting after a day of exploring Puerto Natales and Patagonia.$$ WHERE id = '44f79162-6c35-47bb-83ef-36d988ebb83f';

UPDATE core_units SET description_en = $$Located in downtown Puerto Natales, this apartment for 3 guests features one bedroom with both a double bed and a single bed, along with central heating, satellite TV, and Wi-Fi. It is perfect for couples or small families looking for comfort, a great location, and a warm space to recharge after their excursions.$$ WHERE id = '0cb4ab96-08e8-4337-b3c2-10717cf68e77';

UPDATE core_units SET description_en = $$This apartment for 4 guests features two bedrooms (one with a double bed and the other with two single beds), an equipped kitchen, central heating, satellite TV, and Wi-Fi. Just a few blocks from the bus terminal and close to supermarkets, it is a convenient, practical base for exploring Puerto Natales and heading out toward Torres del Paine.$$ WHERE id = '128ca3e0-99a8-4d9c-becb-99edbb93acec';

UPDATE core_units SET description_en = $$A spacious, bright upstairs apartment for up to 5 guests, with two bedrooms (one with a double bed, the other with two single beds) and a sofa bed in the living room. It includes a fully equipped kitchen, central heating, satellite TV, and Wi-Fi—ideal for families or groups looking for comfort and a great location in Puerto Natales.$$ WHERE id = '32babfdf-5c5f-4a1f-a23b-61ac6da56798';

UPDATE core_units SET description_en = $$Tiny House Calafate is a cozy studio designed for couples, featuring a double bed, a compact kitchen, a private bathroom, and central heating. Located within the Arte Brisa Patagonia complex, 5 km from Puerto Natales, it invites you to unplug, wake up to mountain views, and enjoy the quiet of southern Chile after exploring the area and Torres del Paine.$$ WHERE id = 'e72e822f-cc4a-48b6-9f76-f8485eac68aa';

UPDATE core_units SET description_en = $$Tiny House Margarita is a cozy nook for 2 guests, ideal for couples seeking rest and privacy in the heart of Patagonia. Located just 5 km from Puerto Natales within the Arte Brisa Patagonia complex, this studio features a double bed, a small kitchen, a private bathroom, and central heating—perfect for unwinding surrounded by nature and mountain views.$$ WHERE id = 'e5b784ee-e87f-497c-abd1-cda1352d6806';

UPDATE core_units SET description_en = $$Tiny House Ñirre offers an intimate space for 2 guests, ideal for couples looking for peace and nature in the heart of Patagonia. Located just 5 km from Puerto Natales within the Arte Brisa Patagonia complex, this studio includes a double bed, a small kitchen, a private bathroom, and central heating—perfect for resting and unplugging with mountain views.$$ WHERE id = '2e4145b0-6cbe-42fb-9bbf-f49f286ec1d1';

UPDATE core_units SET description_en = $$Tiny House Violeta is an intimate retreat for 2 guests, ideal for couples seeking rest and tranquility in the heart of Patagonia. Located just 5 km from Puerto Natales within the Arte Brisa Patagonia complex, this studio comes with a double bed, a small kitchen, a private bathroom, and central heating—perfect for relaxing and taking in the natural surroundings.$$ WHERE id = 'f3177f46-35cd-4d47-85ae-f7ca98d24a7b';
