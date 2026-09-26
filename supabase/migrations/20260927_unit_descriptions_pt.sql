-- Add Brazilian Portuguese descriptions for all 12 active units (core_units.description_pt)
-- Date: 2026-09-27
-- Purpose: Populate description_pt for the /pt/* site (i18n phase 4).
--          Like description_de, this column does NOT exist yet, so the
--          migration creates it first. The frontend selects description_pt
--          (src/data/units.js), so this migration MUST be applied BEFORE
--          deploying the frontend, otherwise the unit queries fail.
--          Frontend falls back to the Spanish description when
--          description_pt is null/empty.

ALTER TABLE core_units ADD COLUMN IF NOT EXISTS description_pt text;

UPDATE core_units SET description_pt = $$A Cabaña Chilco oferece um ambiente aconchegante e familiar para 5 hóspedes, com dois quartos bem distribuídos, cozinha equipada, aquecimento central, TV por satélite, Wi-Fi e estacionamento privativo. A apenas 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, é uma excelente base para explorar a região e relaxar em meio à paisagem patagônica.$$ WHERE id = '9a95daab-f318-4835-b701-f6ea88bc114d';

UPDATE core_units SET description_pt = $$A Cabaña Ciruelillo é uma opção espaçosa e confortável para até 6 hóspedes, com três quartos: uma suíte principal com cama king size e dois quartos adicionais com duas camas de solteiro cada. A apenas 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, conta com cozinha totalmente equipada, aquecimento central, TV por satélite, Wi-Fi e estacionamento privativo. Ideal para famílias grandes ou grupos de amigos que buscam natureza e descanso perto de Torres del Paine.$$ WHERE id = 'f3fb1be8-cd83-4a5d-b340-8fd83421bd58';

UPDATE core_units SET description_pt = $$A Cabaña Flor de Notro oferece um ambiente íntimo e confortável para 4 hóspedes, com um quarto principal com cama king size e um segundo quarto com duas camas de solteiro grandes. Dentro do complexo Arte Brisa Patagonia, a 5 km de Puerto Natales, conta com cozinha equipada, aquecimento central, TV por satélite, Wi-Fi e estacionamento privativo — perfeita para relaxar depois de explorar a Patagônia e o Parque Nacional Torres del Paine.$$ WHERE id = '13a700ab-f974-46ac-b39b-edbec4c5484d';

UPDATE core_units SET description_pt = $$Uma cabana clara e aconchegante para até 5 hóspedes, com um quarto principal com cama king size e um loft com três camas de solteiro. A 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, conta com cozinha equipada, máquina de lavar roupa, aquecimento central, TV por satélite, Wi-Fi e estacionamento privativo. Ideal para famílias ou amigos que buscam tranquilidade e natureza perto de Torres del Paine.$$ WHERE id = '4703fcf0-4788-421a-8ad7-a800fb99f9c6';

UPDATE core_units SET description_pt = $$Este apartamento no térreo acomoda até 5 hóspedes em dois quartos: um com cama de casal e uma cama de solteiro, e outro com duas camas. Conta com aquecimento central, TV por satélite e Wi-Fi. Um espaço confortável e familiar, ideal para descansar depois de um dia explorando Puerto Natales e a Patagônia.$$ WHERE id = '44f79162-6c35-47bb-83ef-36d988ebb83f';

UPDATE core_units SET description_pt = $$Localizado no centro de Puerto Natales, este apartamento para 3 hóspedes tem um quarto com cama de casal e uma cama de solteiro, além de aquecimento central, TV por satélite e Wi-Fi. Perfeito para casais ou famílias pequenas que buscam conforto, ótima localização e um espaço acolhedor para recarregar as energias depois dos passeios.$$ WHERE id = '0cb4ab96-08e8-4337-b3c2-10717cf68e77';

UPDATE core_units SET description_pt = $$Este apartamento para 4 hóspedes tem dois quartos (um com cama de casal e outro com duas camas de solteiro), cozinha equipada, aquecimento central, TV por satélite e Wi-Fi. A poucos quarteirões do terminal de ônibus e perto de supermercados, é uma base prática e conveniente para conhecer Puerto Natales e partir rumo a Torres del Paine.$$ WHERE id = '128ca3e0-99a8-4d9c-becb-99edbb93acec';

UPDATE core_units SET description_pt = $$Um apartamento amplo e iluminado no andar de cima, para até 5 hóspedes, com dois quartos (um com cama de casal e outro com duas camas de solteiro) e um sofá-cama na sala. Inclui cozinha totalmente equipada, aquecimento central, TV por satélite e Wi-Fi — ideal para famílias ou grupos que buscam conforto e uma ótima localização em Puerto Natales.$$ WHERE id = '32babfdf-5c5f-4a1f-a23b-61ac6da56798';

UPDATE core_units SET description_pt = $$A Tiny House Calafate é um estúdio aconchegante pensado para casais, com cama de casal, cozinha compacta, banheiro privativo e aquecimento central. Dentro do complexo Arte Brisa Patagonia, a 5 km de Puerto Natales, convida você a se desconectar, acordar com vista para as montanhas e aproveitar a quietude do sul do Chile depois de explorar a região e Torres del Paine.$$ WHERE id = 'e72e822f-cc4a-48b6-9f76-f8485eac68aa';

UPDATE core_units SET description_pt = $$A Tiny House Margarita é um cantinho aconchegante para 2 hóspedes, ideal para casais que buscam descanso e privacidade no coração da Patagônia. A apenas 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, este estúdio conta com cama de casal, cozinha pequena, banheiro privativo e aquecimento central — perfeito para relaxar em meio à natureza, com vista para as montanhas.$$ WHERE id = 'e5b784ee-e87f-497c-abd1-cda1352d6806';

UPDATE core_units SET description_pt = $$A Tiny House Ñirre oferece um espaço íntimo para 2 hóspedes, ideal para casais que buscam paz e natureza no coração da Patagônia. A apenas 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, este estúdio inclui cama de casal, cozinha pequena, banheiro privativo e aquecimento central — perfeito para descansar e se desconectar com vista para as montanhas.$$ WHERE id = '2e4145b0-6cbe-42fb-9bbf-f49f286ec1d1';

UPDATE core_units SET description_pt = $$A Tiny House Violeta é um refúgio íntimo para 2 hóspedes, ideal para casais que buscam descanso e tranquilidade no coração da Patagônia. A apenas 5 km de Puerto Natales, dentro do complexo Arte Brisa Patagonia, este estúdio conta com cama de casal, cozinha pequena, banheiro privativo e aquecimento central — perfeito para relaxar e apreciar a natureza ao redor.$$ WHERE id = 'f3177f46-35cd-4d47-85ae-f7ca98d24a7b';
