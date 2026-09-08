-- ============================================================================
-- Ronda "Horario VIP" + catálogo de servicios nuevo (PDF de Luis, 2026-08-27)
-- Ejecutar en el SQL Editor de Supabase. Es seguro correr más de una vez:
-- las columnas usan IF NOT EXISTS y los servicios nuevos solo se insertan si
-- todavía no existe uno con exactamente ese nombre.
-- ============================================================================

-- 1. Horario VIP — columnas nuevas en bookings
alter table bookings add column if not exists is_vip boolean not null default false;
alter table bookings add column if not exists vip_surcharge numeric;

-- ============================================================================
-- 2. Catálogo de servicios nuevo/actualizado — Manicuras, Pedicuras, Cabello
--    (contenido tomado directo de "Nueva función- Horario VIP.pdf")
-- ============================================================================

-- ---------- MANICURAS ----------
insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Clear Gel',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye base niveladora transparente para mejorar y proteger el aspecto de la uña natural. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '1h','$30',0,101,true
where not exists (select 1 from services where name='Manicura Profunda Clear Gel');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Color Gel - Short Nails',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye base autoniveladora para un acabado uniforme y duradero. Ideal para uñas cortas. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '1h 20min','$40',0,102,true
where not exists (select 1 from services where name='Manicura Profunda Color Gel - Short Nails');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Color Gel - Mid & Long Nails',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye nivelación con gel de reconstrucción para aportar mayor estructura y protección. Ideal para uñas medianas a largas. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '1h 40min','$45',0,103,true
where not exists (select 1 from services where name='Manicura Profunda Color Gel - Mid & Long Nails');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Gel Tips - Short',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye aplicación de Gel Tips Cortos y esmaltado en gel a color. Ideal para añadir forma a la uña natural de manera inmediata. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '1h 30min','$45',0,104,true
where not exists (select 1 from services where name='Manicura Profunda Gel Tips - Short');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Gel Tips - Medium',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye aplicación de Gel Tips Medianos, nivelación ligera para mayor estructura y esmaltado en gel a color. Ideal para añadir un poco de largo y forma a la uña natural de manera inmediata. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '1h 45min','$50',0,105,true
where not exists (select 1 from services where name='Manicura Profunda Gel Tips - Medium');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Profunda Gel Tips - Long',
  'Manicura en seco con limpieza profunda de cutícula y preparación detallada de la uña. Incluye aplicación de Gel Tips Largos y nivelación reforzada para aportar mayor estructura al largo, seguida de esmaltado en gel a color. Ideal para añadir largo y forma a la uña natural de manera inmediata. Finalizamos con aceite de cutícula, exfoliante y crema de manos. Add ons: remoción material no de KS $5+ (add 10min) / Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Diseño Elaborado $10 (add 20min) / Diseño Extenso $15 (add 30min) / Tratamiento Fortalecedor de Uña Natural $15 (add 20min)',
  '2h','$55',0,106,true
where not exists (select 1 from services where name='Manicura Profunda Gel Tips - Long');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Remoción + Manicura Restaurativa (Sin Esmaltado)',
  'Remoción completa de material anterior seguido de manicura en seco y limpieza profunda de cutícula. Incluye tratamiento fortalecedor para ayudar a mejorar la apariencia e integridad de la uña natural. Finalizamos con limado, aceite de cutícula, exfoliante y crema de manos. Ideal para quienes desean retirar gel, Gel Tips, builder/acrílico u otro material y continuar con su uña natural, sin aplicar nuevo material ni esmaltado. Add ons: Esmaltado Clear Regular $3 (add 5min) / Esmaltado Color Regular $10 (add 30min)',
  '1h','$35',0,107,true
where not exists (select 1 from services where name='Remoción + Manicura Restaurativa (Sin Esmaltado)');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'manicure','Manicuras','Manicura Restaurativa (Sin Esmaltado)',
  'Manicura en seco y limpieza profunda de cutícula. Incluye tratamiento fortalecedor para ayudar a mejorar la apariencia e integridad de la uña natural. Finalizamos con limado, aceite de cutícula, exfoliante y crema de manos. Ideal para: uñas naturales débiles, quebradizas, con descamación, daño o desprendimiento leve que necesitan cuidado y fortalecimiento durante su crecimiento. No incluye esmaltado. Add ons: Esmaltado Clear Regular $3 (add 5min) / Esmaltado Color Regular $10 (add 30min)',
  '45min','$30',0,108,true
where not exists (select 1 from services where name='Manicura Restaurativa (Sin Esmaltado)');

-- ---------- PEDICURAS ----------
insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'pedicure','Pedicuras','Pedicura Spa + Color Regular',
  'Pedicura en agua con limpieza profunda de uñas y cutículas. Tratamiento especializado con microalgas, aceites esenciales, piedra pómez y agentes hidratantes para exfoliar, suavizar callosidades y renovar la piel. Finalizamos con hidratación, masaje y esmaltado regular a color. Add ons: Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Tratamiento Fortalecedor de Uña Natural $10 (add 15min)',
  '1h 10min','$60',0,201,true
where not exists (select 1 from services where name='Pedicura Spa + Color Regular');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'pedicure','Pedicuras','Pedicura Spa + Color Gel',
  'Pedicura en agua con limpieza profunda de uñas y cutículas. Tratamiento especializado con microalgas, aceites esenciales, piedra pómez y agentes hidratantes para exfoliar, suavizar callosidades y renovar la piel. Finalizamos con hidratación y esmaltado en gel a color para un acabado brillante y duradero. Add ons: Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 10min) / Tratamiento Fortalecedor de Uña Natural $10 (add 15min)',
  '1h 10min','$70',0,202,true
where not exists (select 1 from services where name='Pedicura Spa + Color Gel');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'pedicure','Pedicuras','Cambio de color en gel (pies)',
  'Remoción del esmaltado anterior, corte y limado de uñas, preparación y limpieza básica de cutícula, seguida de esmaltado en gel a color. Add ons: Reconstrucción de uña $2 c/u (add 3min) / Diseño sencillo $5 (add 5min) / Tratamiento Fortalecedor de Uña Natural $10 (add 15min)',
  '20min','$20',0,203,true
where not exists (select 1 from services where name='Cambio de color en gel (pies)');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'pedicure','Pedicuras','Cambio de color en regular (pies)',
  'Remoción del esmaltado anterior, corte y limado de uñas, preparación y limpieza básica de cutícula, seguida de esmaltado en regular a color. Add ons: Tratamiento Fortalecedor de Uña Natural $10 (add 15min)',
  '20min','$15',0,204,true
where not exists (select 1 from services where name='Cambio de color en regular (pies)');

insert into services (category_id, category_title, name, description, duration, price, cost, display_order, active)
select 'pedicure','Pedicuras','Tratamiento Restaurativo para uñas de los pies',
  'Cuidado enfocado en restaurar y fortalecer las uñas naturales de los pies. Incluye corte y limado, limpieza de cutícula y preparación de la uña, seguido de un tratamiento fortalecedor que ayuda a mejorar su resistencia e integridad. Ideal para: uñas naturales débiles, quebradizas, con descamación, daño o desprendimiento leve. No incluye esmaltado ni pedicura.',
  '30min','$15',0,205,true
where not exists (select 1 from services where name='Tratamiento Restaurativo para uñas de los pies');

-- ---------- CABELLO ----------
insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Lavado, Secado & Planchado Corto o Mediano',
  'Incluye lavado, secado y planchado para un acabado limpio y pulido. Largo: cabello por encima del hombro hasta la línea del brasier. Add on: Tengo extensiones $10 (add 25min) / Hair Boost $15 (add 10min)',
  '1h','$25 a $35',0,'Lavado & Peinado',301,true
where not exists (select 1 from services where name='Lavado, Secado & Planchado Corto o Mediano');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Lavado, Secado & Planchado Largo o Xlargo',
  'Incluye lavado, secado y planchado para un acabado limpio y pulido. Largo: cabello debajo de la línea del brasier o de media espalda en adelante. Add on: Tengo extensiones $10 (add 25min) / Hair Boost $15 (add 10min)',
  '1h 20min','$40 a $45',0,'Lavado & Peinado',302,true
where not exists (select 1 from services where name='Lavado, Secado & Planchado Largo o Xlargo');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Lavado, Secado & Ondas Corto o Mediano',
  'Incluye lavado, secado y estilizado con ondas para lograr un acabado definido, con movimiento y volumen. Ideal para quienes desean un peinado más elaborado sin recogido. Puedes adjuntar una foto de inspiración al reservar. Largo: cabello por encima del hombro hasta la línea del brasier. Add on: Tengo extensiones $15 (add 25min) / Hair Boost $15 (add 10min)',
  '1h 30min','$40 a $50',0,'Lavado & Peinado',303,true
where not exists (select 1 from services where name='Lavado, Secado & Ondas Corto o Mediano');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Lavado, Secado & Ondas Largo o Xlargo',
  'Incluye lavado, secado y estilizado con ondas para lograr un acabado definido, con movimiento y volumen. Ideal para quienes desean un peinado más elaborado sin recogido. Puedes adjuntar una foto de inspiración al reservar. Largo: cabello debajo de la línea del brasier o de media espalda en adelante. Add on: Tengo extensiones $15 (add 25min) / Hair Boost $15 (add 10min)',
  '2h','$55 a $60',0,'Lavado & Peinado',304,true
where not exists (select 1 from services where name='Lavado, Secado & Ondas Largo o Xlargo');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Peinado',
  'Peinado personalizado según el look que deseas, desde estilos sencillos hasta peinados más elaborados. Puedes adjuntar una foto de inspiración al reservar. El precio puede variar según el largo, densidad y complejidad del peinado. No incluye lavado, secado ni estilizado, de desearlo puede añadir el servicio.',
  '1h 30min','$65+',0,'Lavado & Peinado',305,true
where not exists (select 1 from services where name='Peinado');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Corte de puntas',
  'Corte de mantenimiento enfocado en retirar puntas maltratadas y conservar el largo y la forma actual del cabello. Ideal para mantener las puntas saludables sin realizar un cambio de estilo. No incluye lavado, secado ni estilizado, de desearlo puede añadir el servicio.',
  '30min','$25',0,'Cortes',306,true
where not exists (select 1 from services where name='Corte de puntas');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Corte con estilo',
  'Corte diseñado para crear o modificar la forma y el estilo del cabello, incluyendo capas u otros cambios según el resultado deseado. Puedes adjuntar una foto de inspiración al reservar. No incluye lavado, secado ni estilizado, de desearlo puede añadir el servicio.',
  '30min','$32',0,'Cortes',307,true
where not exists (select 1 from services where name='Corte con estilo');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Evaluación, Consulta y/o Prueba de Mecha',
  'Servicio de evaluación para conocer el historial, condición actual del cabello y resultado deseado antes de realizar un proceso de tratamiento, color o aclarado. De ser necesario, se realizará una prueba de mecha para evaluar cómo responde el cabello al proceso químico y determinar la viabilidad del servicio. Ideal para cambios significativos, correcciones de color o cuando existe un historial químico previo. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado.',
  '30min','$20',0,'Color & Mechas',308,true
where not exists (select 1 from services where name='Evaluación, Consulta y/o Prueba de Mecha');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Full Color',
  'Aplicación de un solo color desde la raíz hasta las puntas para lograr un tono uniforme y renovar el color del cabello. Ideal para oscurecer, refrescar o cambiar el tono actual. El precio puede variar según el largo, densidad, cantidad de producto requerida o si es necesaria una corrección de color. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado. No incluye secado ni planchado, de desearlo puede añadir el servicio.',
  '1h 30min','$70+',0,'Color & Mechas',309,true
where not exists (select 1 from services where name='Full Color');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Retoque de Color',
  'Aplicación de color enfocada en el crecimiento de la raíz para mantener y refrescar el tono existente. Ideal para cubrir crecimiento o canas sin realizar una aplicación de color completa. El precio puede variar según el crecimiento, densidad, cantidad de producto requerida o si es necesaria una corrección de color. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado. No incluye secado ni planchado, de desearlo puede añadir el servicio.',
  '1h','$60+',0,'Color & Mechas',310,true
where not exists (select 1 from services where name='Retoque de Color');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Highlight Parcial',
  'Servicio de aclarado estratégico en secciones específicas del cabello para aportar dimensión, luminosidad y contraste sin realizar un highlight completo. Incluye matizado y toner para neutralizar tonos no deseados y lograr el tono final deseado. Ideal para refrescar highlights existentes o iluminar áreas como el contorno del rostro y la parte superior. El precio puede variar según el largo, densidad, cantidad de producto requerida o si es necesaria una corrección de color. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado. No incluye secado ni planchado.',
  '1h 30min','$95+',0,'Color & Mechas',311,true
where not exists (select 1 from services where name='Highlight Parcial');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Highlights Full',
  'Servicio de aclarado trabajado en todo el cabello para crear dimensión, luminosidad y contraste de manera uniforme. Incluye matizado y toner para neutralizar tonos no deseados y lograr el tono final deseado. Ideal para quienes buscan un cambio más completo o mayor presencia de tonos claros. El precio puede variar según el largo, densidad, cantidad de producto requerida o si es necesaria una corrección de color. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado. No incluye secado ni planchado.',
  '3h','$110+',0,'Color & Mechas',312,true
where not exists (select 1 from services where name='Highlights Full');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Balayage',
  'Técnica de aclarado personalizada que crea una transición suave y natural de tonos, aportando dimensión y luminosidad al cabello con un efecto degradado. Incluye matizado y toner para neutralizar tonos no deseados y lograr el tono final deseado. Ideal para quienes buscan un resultado de bajo mantenimiento y crecimiento más difuminado. El precio puede variar según el largo, densidad, cantidad de producto requerida o si es necesaria una corrección de color. Al reservar, adjunta una foto clara de tu cabello actual al natural y una foto de inspiración del resultado deseado. No incluye secado ni planchado.',
  '4h','$165+',0,'Color & Mechas',313,true
where not exists (select 1 from services where name='Balayage');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Toner',
  'Servicio de matización diseñado para neutralizar tonos no deseados, refrescar el color y ajustar el tono de cabellos previamente aclarados. Ideal para mantener rubios, highlights o balayage entre servicios de aclarado. El precio puede variar según el largo, densidad y cantidad de producto requerida. Al reservar, adjunta una foto clara de tu cabello al natural actual y una foto de inspiración del tono deseado. No incluye secado ni planchado.',
  '1h','$40+',0,'Color & Mechas',314,true
where not exists (select 1 from services where name='Toner');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Remoción de color',
  'Servicio diseñado para remover o reducir pigmento artificial previamente aplicado en el cabello y preparar una base adecuada para un cambio de color. El resultado y las sesiones necesarias pueden variar según el historial, condición del cabello, tono actual y resultado deseado. Al reservar, adjunta una foto clara de tu cabello actual y una foto de inspiración del resultado que deseas.',
  '1h','$50+',0,'Color & Mechas',315,true
where not exists (select 1 from services where name='Remoción de color');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Tratamiento 3 en 1 Miracle Blend',
  'Tratamiento capilar intensivo que combina keratina, botox capilar y células madre, junto a activos nutritivos como colágeno, aminoácidos, vitamina B5, aloe vera, aceite de coco y proteínas de seda. Ayuda a fortalecer y acondicionar la fibra capilar, controlar el frizz, mejorar la suavidad, brillo y manejabilidad del cabello. Ideal para cabellos secos, opacos, porosos, con frizz, sobreprocesados o con daño térmico y químico. Resultados hasta aprox. 3 meses. Precio desde $120, el costo final se determina según las onzas de producto necesarias.',
  '2h','$120+',0,'Tratamientos Premium',316,true
where not exists (select 1 from services where name='Tratamiento 3 en 1 Miracle Blend');

insert into services (category_id, category_title, name, description, duration, price, cost, subgroup, display_order, active)
select 'cabello','Cabello','Tratamiento Cirugía Plástica Dos Fios',
  'Tratamiento termo-reconstructor formulado con açaí, arginina y ácido acético, activos que ayudan a fortalecer y acondicionar la fibra capilar, sellar la cutícula y mejorar la suavidad y el brillo. Reduce significativamente el frizz y volumen, dejando el cabello más liso, disciplinado y manejable. Ideal para cabellos con frizz, volumen, resequedad o dificultad para mantenerse alineados. Resultados hasta aprox. 6 meses. Precio desde $190 según la cantidad de producto utilizada.',
  '4h','$190+',0,'Tratamientos Premium',317,true
where not exists (select 1 from services where name='Tratamiento Cirugía Plástica Dos Fios');
