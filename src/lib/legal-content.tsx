import type { ReactNode } from 'react';
import config from '../../project-config.json';

const email = <a href={`mailto:${config.securityEmail}`}>{config.securityEmail}</a>;
export const pageContent: Record<string, { label: string; title: string; lead: string; sections: { title: string; content: ReactNode }[] }> = {
  '/privacy': {
    label: 'PRIVACIDAD', title: 'Tu información, con contexto.',
    lead: 'Información sobre la navegación y el contacto durante la fase de preparación de StaneLabs.',
    sections: [
      { title: 'Un proyecto en preparación', content: <p>StaneLabs aún no está constituido como entidad y este sitio tiene carácter informativo. Antes de iniciar una actividad comercial se publicarán la identidad y los datos de contacto del titular, así como el aviso de privacidad completo. Para cuestiones sobre esta versión, puedes escribir a {email}.</p> },
      { title: 'Qué ocurre al navegar', content: <><p>El sitio no incorpora herramientas de publicidad, analítica ni cookies propias de seguimiento. Las tipografías y los recursos de la página se sirven desde el mismo origen.</p><p>Para entregar las páginas y proteger el servicio, el alojamiento y, si se utiliza, el proveedor de red pueden procesar datos técnicos como la dirección IP, la URL solicitada y la fecha de acceso. Esta nota no afirma que el alojamiento carezca de registros ni que la navegación sea anónima.</p></> },
      { title: 'Qué ocurre al contactar', content: <><p>Comparte únicamente tu nombre, un correo de respuesta y una descripción general de la consulta. No envíes contraseñas, claves, documentos confidenciales ni datos personales de terceros.</p><p>Si el formulario abre un borrador, el envío depende de tu aplicación y proveedor de correo. Si ofrece envío directo, transmite esos campos a la API del sitio para entregarlos por correo. La aplicación no almacena las consultas en una base de datos; el mensaje puede permanecer en los buzones y servicios de correo que intervienen.</p><p>El contenido de una consulta se utiliza para responderla y dar seguimiento a lo que has solicitado. No se utiliza para suscribirte a comunicaciones comerciales.</p></> },
      { title: 'Conservación y proveedores', content: <p>La conservación de mensajes y registros depende del alojamiento y del correo utilizados. Antes de abrir el servicio al público se concretarán los proveedores, los plazos de conservación, la base jurídica y las posibles transferencias internacionales. Mientras tanto, evita compartir información sensible en este canal inicial.</p> },
      { title: 'Consultas sobre tus datos', content: <p>Escribe a {email} para solicitar información sobre una consulta que hayas enviado, su corrección o eliminación. Describe tu solicitud sin adjuntar documentación de identidad de entrada; si hace falta verificarla, se acordará un medio proporcionado. Esta nota de fase informativa no sustituye la información completa del responsable que debe publicarse antes del lanzamiento.</p> },
    ],
  },
  '/security': {
    label: 'SEGURIDAD', title: 'Divulgación responsable.',
    lead: 'Un canal claro para comunicar un posible problema de seguridad en este sitio.',
    sections: [
      { title: 'Cómo comunicar un hallazgo', content: <><p>Escribe a {email} con la URL afectada, una descripción del problema, su posible impacto y los pasos mínimos para reproducirlo. Indica un correo al que podamos responder.</p><p>Comparte una prueba limitada y elimina de capturas y ejemplos las credenciales, los tokens y los datos personales. Si el informe necesita información sensible, acuerda primero un canal adecuado.</p></> },
      { title: 'Alcance y límites', content: <><p>Este canal se refiere al sitio stanelabs.com y sus servicios propios. Los sistemas de terceros, proveedores o posibles clientes no forman parte de ese alcance.</p><p>Estas pautas no autorizan pruebas intrusivas. No realices denegación de servicio, ingeniería social, envío masivo de mensajes, extracción de datos ni acceso a cuentas ajenas. Si encuentras información de otra persona, detente y comunica el hallazgo sin copiarla ni alterarla.</p></> },
      { title: 'Seguimiento del informe', content: <p>La comunicación permite revisar el problema y acordar los siguientes pasos. No se promete un plazo de respuesta, recompensa ni un programa de bug bounty. Evita publicar detalles que permitan explotar el fallo mientras se coordina su revisión.</p> },
      { title: 'Datos del canal', content: <p>El archivo <a href="/.well-known/security.txt">security.txt</a> recoge el contacto y la ubicación de esta política. El idioma de atención indicado es español. Este canal no es un servicio de emergencias ni de respuesta a incidentes de terceros.</p> },
    ],
  },
  '/tos': {
    label: 'CONDICIONES DE USO', title: 'Un alcance claro desde el principio.',
    lead: 'Condiciones para consultar esta versión informativa de StaneLabs, un proyecto aún en preparación.',
    sections: [
      { title: 'Qué ofrece esta versión', content: <p>El sitio presenta áreas de trabajo, una metodología y ejemplos ilustrativos. StaneLabs aún no está constituido y esta versión no ofrece contratación online. Navegar, abrir un borrador o enviar una consulta no crea un contrato ni una relación de asesoramiento profesional.</p> },
      { title: 'Uso del sitio', content: <p>Utiliza la página y sus canales de contacto de forma lícita y respetuosa. No introduzcas datos de terceros sin autorización, no intentes acceder a cuentas o sistemas ajenos y no interfieras con la disponibilidad del servicio. La comunicación de posibles vulnerabilidades se describe en la <a href="/security">política de seguridad</a>.</p> },
      { title: 'Contenido y ejemplos', content: <p>Los ejemplos de entregables son demostraciones de formato; no representan trabajos de clientes ni garantizan resultados. La información general del sitio no sustituye una evaluación de tu entorno. Cualquier trabajo futuro requerirá un alcance, una autorización y unas condiciones acordadas por escrito.</p> },
      { title: 'Materiales del sitio', content: <p>Los textos, el diseño y los recursos propios se presentan para su consulta. Los recursos de terceros conservan sus respectivas licencias. La presencia de una marca o un recurso no implica certificación, afiliación ni autorización para reutilizarlo fuera de lo permitido por su titular.</p> },
      { title: 'Contacto y cambios', content: <p>Para comunicar un problema o aclarar una condición, escribe a {email}. Las condiciones se actualizarán cuando se identifique al titular y se defina la actividad comercial. Puedes consultar el estado de la contratación en <a href="/purchase">contratación y compras</a> y el funcionamiento del contacto en la <a href="/privacy">nota de privacidad</a>.</p> },
    ],
  },
  '/purchase': {
    label: 'CONTRATACIÓN Y COMPRAS', title: 'Todavía no aceptamos compras.',
    lead: 'StaneLabs está en preparación. No hay productos a la venta, pasarela de pago ni contratación online en esta versión.',
    sections: [
      { title: 'El primer contacto es informativo', content: <p>Puedes plantear una necesidad general por correo. Esa conversación no constituye una reserva, un pedido ni la aceptación de una oferta. No se solicita ningún pago desde este sitio.</p> },
      { title: 'Antes de ofrecer un servicio', content: <p>Se identificarán el titular y sus datos fiscales y de contacto. Una propuesta deberá detallar el alcance, las autorizaciones necesarias, los entregables, los plazos, el precio y los impuestos aplicables, así como las condiciones de pago, cancelación y los derechos que correspondan. Hasta entonces no se formalizan compras a través de esta página.</p> },
      { title: 'Pagos y datos sensibles', content: <p>No envíes datos de tarjeta, documentos de identidad, claves de acceso ni anticipos a partir de esta página. Si recibes una solicitud de pago que afirme proceder de StaneLabs, contrástala por un canal conocido antes de actuar.</p> },
      { title: 'Dónde consultar', content: <p>Para dudas sobre esta fase, escribe a {email}. Consulta también las <a href="/tos">condiciones de uso</a> y la <a href="/privacy">nota de privacidad</a>.</p> },
    ],
  },
};
