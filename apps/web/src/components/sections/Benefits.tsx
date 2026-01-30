const benefits = [
  {
    title: 'Correa retráctil integrada',
    description: 'No más correas separadas. Todo en un solo producto práctico y funcional.',
  },
  {
    title: 'Ajuste cómodo y seguro',
    description: 'Diseñado para distribuir la presión de manera uniforme, protegiendo el cuello de tu perro.',
  },
  {
    title: 'Fácil de usar',
    description: 'Sistema intuitivo que permite controlar la longitud de la correa con un solo botón.',
  },
  {
    title: 'Duradero y resistente',
    description: 'Materiales de alta calidad pensados para resistir el uso diario y los elementos.',
  },
  {
    title: 'Diseño moderno',
    description: 'Estilo minimalista que se adapta a cualquier ocasión, desde paseos casuales hasta aventuras.',
  },
];

export function Benefits() {
  return (
    <section className="bg-background-white py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-text-black text-center mb-12">
          ¿Por qué elegir PawGo?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-background-light-gray p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-text-black mb-3">
                {benefit.title}
              </h3>
              <p className="text-text-dark-gray leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

