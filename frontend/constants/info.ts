/**
 * Contenido de la pestaña Info: lo del programa de fiestas que no cabe en el
 * mapa porque no tiene una hora ni un punto únicos (ferias abiertas varios
 * días, exposiciones, teléfonos…).
 *
 * Es estático a propósito: no cambia durante las fiestas y nadie lo edita por
 * API, así que viaja en el bundle en vez de en la base de datos. Los eventos
 * con día y hora concretos sí van a `events` y se ven en el mapa.
 *
 * Fuente: programa oficial de San Mateo 2026 del Ayuntamiento de Logroño.
 * Coordenadas de OpenStreetMap; las entradas sin `coords` es que no tienen
 * una entrada fiable en OSM y solo se muestra la dirección.
 */

export interface InfoEntry {
  title: string
  /** Fechas y horarios, tal como los publica el programa. */
  when?: string
  /** Detalles sueltos: organizador, precios, notas. */
  notes?: string[]
  /** Dirección legible. */
  place?: string
  coords?: { lat: number; lng: number }
  phone?: string
  url?: string
}

export interface InfoSection {
  key: string
  emoji: string
  title: string
  entries: InfoEntry[]
}

export const INFO_SECTIONS: InfoSection[] = [
  {
    key: 'ferias',
    emoji: '🎡',
    title: 'Ferias y mercados',
    entries: [
      {
        title: 'XLII Feria Nacional de Cerámica y Alfarería',
        when: 'Del sábado 19 a las 18:00 al jueves 24 a las 22:00. De 11:00 a 14:30 y de 17:30 a 22:00',
        place: 'Paseo del Espolón',
        coords: { lat: 42.46471, lng: -2.44557 },
      },
      {
        title: 'ARTESAR. Mercado de artesanía San Mateo 2026',
        when: 'Del 19 al 25 de septiembre. De 11:00 a 14:30 y de 17:30 a 21:00',
        place: 'Glorieta del Doctor Zubía, pared del Instituto Sagasta',
        coords: { lat: 42.46552, lng: -2.44272 },
        notes: ['Asociación de Artesanos de La Rioja'],
      },
      {
        title: 'Recinto ferial de Las Norias',
        when: 'Del 19 al 28 de septiembre',
        place: 'Paseo de las Norias',
        coords: { lat: 42.47351, lng: -2.45175 },
        notes: [
          'El 28, día del niño a precios reducidos',
          'El 24, de 17:00 a 19:00, día inclusivo para personas con autismo u otras discapacidades: feria sin ruido, música ni luces',
        ],
      },
      {
        title: 'Circo Holiday',
        when: 'Del 18 al 26 de septiembre',
      },
      {
        title: 'Venta ambulante',
        when: 'Del 19 al 28 de septiembre',
        place: 'Paseo de las Norias',
        coords: { lat: 42.47351, lng: -2.45175 },
      },
    ],
  },

  {
    key: 'visitas',
    emoji: '🏛️',
    title: 'Visitas guiadas',
    entries: [
      {
        title: 'Visitas guiadas a la ciudad de Logroño',
        when: '18 sep: 18:00 · 19 sep: 12:00 y 18:00 · 20 sep: 12:00 · 25 sep: 18:00 · 26 sep: 12:00 y 18:00 · 27 sep: 12:00',
        place: 'Salidas: Oficina de Turismo y Plaza de la Diversidad (Escuelas Daniel Trevijano)',
        coords: { lat: 42.4663, lng: -2.45058 },
        notes: [
          'General 5 € · Reducido 4 € para personas jubiladas, desempleadas, con carné joven, universitarias, con discapacidad igual o superior al 33 %, menores de 7 a 16 años y familias numerosas',
        ],
        phone: '941291260',
        url: 'https://logrono.sacatuentrada.es',
      },
      {
        title: 'Torre de la Concatedral de la Redonda',
        when: 'Días 20, 22, 23, 24, 25, 26 y 27. De 11:00 a 14:00 y de 18:00 a 20:00',
        place: 'Concatedral de Santa María de la Redonda',
        coords: { lat: 42.46661, lng: -2.44534 },
      },
    ],
  },

  {
    key: 'exposiciones',
    emoji: '🖼️',
    title: 'Exposiciones',
    entries: [
      {
        title: '«El rastro de Wei», de Rafa Pérez',
        when: 'Del 10 de septiembre al 22 de noviembre. Ma-Vi 11:00-14:00 y 18:00-21:00 · Sá, Do y festivos 11:00-15:00 y 17:00-21:00',
        place: 'Sala Amós Salvador (Once de Junio, 4)',
        coords: { lat: 42.46646, lng: -2.44996 },
      },
      {
        title: 'XXIV Certamen Internacional de Pintura Taurina',
        when: 'Del 16 de septiembre al 4 de octubre. Ma-Vi 17:30-20:30 · Sá, Do y festivos 12:00-14:00 y 17:30-20:30. Lunes cerrado',
        place: 'Sala de exposiciones del Ayuntamiento (Avenida de la Paz, 11)',
        coords: { lat: 42.46575, lng: -2.4401 },
        notes: ['Peña Taurina El Quite'],
      },
      {
        title: '«Entre capotes y barricas»',
        when: 'Del 16 de septiembre al 4 de octubre. Ma-Vi 17:30-20:30 · Sá, Do y festivos 12:00-14:00 y 17:30-20:30. Lunes cerrado',
        place: 'Sala de exposiciones del Ayuntamiento (Avenida de la Paz, 11)',
        coords: { lat: 42.46575, lng: -2.4401 },
        notes: ['Antonio Climent, Pepe Castells y Miguel Soro. Organiza la Peña Taurina El Quite'],
      },
      {
        title: 'Centro de la Cultura del Rioja',
        when: 'De lunes a domingo, de 9:00 a 21:00',
        place: 'CCR (Mercaderes, 9)',
        coords: { lat: 42.46769, lng: -2.44584 },
        notes: [
          '«La familia del vino» (fotografía)',
          '«El vino como pretexto en el cubismo»',
          '«Colección Altadis 01» (planta 2ª)',
        ],
      },
      {
        title: '«Camino del Vino»',
        when: 'De lunes a domingo, de 10:00 a 14:00 y de 16:00 a 20:00',
        place: 'Espacio Lagares y Calado de San Gregorio (Ruavieja 18-20 y 29)',
        coords: { lat: 42.46827, lng: -2.44508 },
      },
      {
        title: 'Biblioteca Rafael Azcona',
        when: 'Lu-Vi 9:00-21:00 · Sá 10:00-14:00 y 16:00-20:00',
        place: 'Alcalde Emilio Francés, 34',
        coords: { lat: 42.46724, lng: -2.43501 },
        notes: [
          '«La bebeteca ilustrada», de Niño Cactus — hasta el 30 de septiembre',
          '«Coser y cantar» — hasta el 1 de octubre',
          '«La maña de morder» — hasta el 1 de octubre',
        ],
      },
      {
        title: 'Casa de las Ciencias',
        when: 'Ma-Vi 9:30-14:00 y 17:00-20:00 · Sá, Do y festivos 10:30-14:00 y 16:30-20:30. Lunes cerrado',
        place: 'C/ del Ebro, 1',
        coords: { lat: 42.47107, lng: -2.44561 },
        notes: ['«Con la música a otra parte» (salas 3 y 4)', '«¿Sabes de aves?» (salas 1 y 2)'],
      },
      {
        title: '«Setenta años en la imagen de las fiestas de San Mateo»',
        when: 'Del 10 al 30 de septiembre',
        place: 'Espacio expositivo «La Antigua Estación»',
        coords: { lat: 42.46005, lng: -2.44448 },
      },
      {
        title: '«Tebeos. La historia de la narrativa gráfica en España y en La Rioja»',
        when: 'Del 1 de septiembre al 24 de octubre. De lunes a sábado, de 18:00 a 21:00',
        place: 'Centro Fundación Caja Rioja La Merced',
      },
      {
        title: 'Colectivo «El hombre que fue jueves»',
        when: 'Del 2 al 19 de septiembre. De lunes a sábado, de 18:00 a 21:00',
        place: 'Centro Fundación Caja Rioja Gran Vía',
      },
    ],
  },

  {
    key: 'chamizos',
    emoji: '🍷',
    title: 'Chamizos de las peñas',
    entries: [
      { title: 'Peña La Unión', place: 'Ateneo Riojano, 10', coords: { lat: 42.46707, lng: -2.43679 } },
      { title: 'Peña Riojana Los Brincos', place: 'Ateneo Riojano, 25', coords: { lat: 42.46707, lng: -2.43679 } },
      { title: 'Peña La Simpatía', place: 'Beratúa, 24', coords: { lat: 42.4678, lng: -2.45769 } },
      { title: 'Peña Logroño', place: 'Madre de Dios, 20', coords: { lat: 42.4693, lng: -2.43682 } },
      { title: 'Peña La Rioja', place: 'San Matías, 6', coords: { lat: 42.4664, lng: -2.4293 } },
      { title: 'Peña La Alegría', place: 'Doce Ligero, 35 bajo', coords: { lat: 42.4677, lng: -2.43782 } },
      { title: 'Peña Aster', place: 'Avenida Doce Ligero de Artillería, 41', coords: { lat: 42.4654, lng: -2.43879 } },
      { title: 'Peña Rondalosa', place: 'Carnicerías, 14-16', coords: { lat: 42.46681, lng: -2.44707 } },
      { title: 'Peña La Uva Riojana', place: 'Avda. Doce Ligero, 29', coords: { lat: 42.4677, lng: -2.43782 } },
    ],
  },

  {
    key: 'deporte',
    emoji: '🏅',
    title: 'Deporte',
    entries: [
      {
        title: 'Torneo de pelota de la vendimia',
        when: 'Del 18 al 27 de septiembre',
        place: 'Frontón Javier Adarraga',
        coords: { lat: 42.47266, lng: -2.4523 },
      },
    ],
  },

  {
    key: 'violeta',
    emoji: '🟣',
    title: 'Puntos Violeta',
    entries: [
      {
        title: 'Plaza del Mercado',
        when: 'Días 19, 20, 21, 22 y 23, de 12:00 a 14:00 y de 19:00 a 24:00',
        coords: { lat: 42.46679, lng: -2.44583 },
      },
      {
        title: 'Plaza del Parlamento',
        when: 'Día 22, de 20:00 a 23:00 (Parrilla Equal)',
        coords: { lat: 42.46682, lng: -2.44965 },
      },
    ],
  },

  {
    key: 'telefonos',
    emoji: '☎️',
    title: 'Teléfonos de interés',
    entries: [
      { title: 'Emergencias · S.O.S. Rioja, Cruz Roja, Bomberos', phone: '112' },
      { title: 'Información General Municipal', phone: '010' },
      { title: 'Policía Nacional', phone: '091' },
      { title: 'Policía Local', phone: '092' },
      { title: 'Unidad de Convivencia de la Policía Local', phone: '618273585' },
      { title: 'Bomberos y Protección Civil', phone: '941225599' },
      { title: 'Hospital San Pedro', phone: '941298000' },
      { title: 'Teléfono de la Esperanza La Rioja', phone: '941490606' },
      { title: 'Servicio Municipal de Urgencias Sociales', phone: '900101555' },
    ],
  },

  {
    key: 'recomendaciones',
    emoji: '⚠️',
    title: 'Recomendaciones',
    entries: [
      {
        title: 'Autoprotección durante las fiestas',
        notes: [
          'En la medida de lo posible, evita usar el vehículo: se producen atascos innecesarios y situaciones de peligro, y algunos actos restringen temporalmente la circulación',
          'Sigue siempre las indicaciones del personal de seguridad',
        ],
      },
      {
        title: 'Cambios en el programa',
        notes: [
          'El Ayuntamiento no se responsabiliza de los cambios de fecha, lugar u hora en las actividades organizadas por otras entidades',
          'Si hubiera que suspender o trasladar algún espectáculo, se anunciará a través de los medios de comunicación',
        ],
      },
    ],
  },
]
