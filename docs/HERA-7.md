# H.E.R.A 7: asistente de IA

## Rol

Guía y acompañante en cada sección. Presenta la plataforma, explica lo que se ve y responde preguntas básicas de astronomía. Su forma es la de un astronauta con las banderas de Perú y de EE. UU., y flota con un movimiento suave en pantalla.

## Estado actual

El prototipo tiene mensajes de bienvenida por sección y tres preguntas rápidas («¿Qué es SKYO?», «Dato curioso», «¿Cómo se usa?»). Las respuestas son textos fijos. No hay un modelo de IA conectado.

## Diseño de la versión conectada

1. El frontend envía a `POST /hera` la pregunta, la sección actual y el contexto (objeto seleccionado, región, fecha).
2. El backend construye un mensaje de sistema con el rol de H.E.R.A 7 y los datos relevantes.
3. Un modelo de lenguaje responde en español.
4. La respuesta vuelve con las fuentes usadas, si las hay.

## Reglas de comportamiento

- Responder en español, con frases cortas y sin jerga; explicar los términos técnicos.
- Basarse en los datos de SKYO y distinguir entre «confirmado» y «candidato».
- No afirmar descubrimientos, como la existencia del Planeta X.
- Decir con claridad cuándo no sabe algo.
- No pedir datos personales.
- Mantener un tono amable y curioso, adecuado para estudiantes.

## Capacidades futuras

- Llevar al usuario a un lugar o fecha («llévame al cometa que más se movió»).
- Proponer misiones guiadas.
- Explicar una detección en lenguaje sencillo.
- Leer las respuestas en voz alta.

## Pendientes de decisión

- Modelo y proveedor, costos y límites de uso.
- Almacenamiento de conversaciones y política de privacidad.
- Evaluación de la calidad de respuestas con preguntas de prueba.
