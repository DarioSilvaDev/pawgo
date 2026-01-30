import Image from "next/image";

export function Product() {
  return (
    <section id="product" className="bg-background-light-gray py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col items-center gap-12">
          {/* Title */}
          <div className="w-full text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-black mb-6">
              Innovación en cada paseo
            </h2>
            <p className="text-lg md:text-xl text-text-dark-gray leading-relaxed max-w-3xl mx-auto">
              Nuestro arnés combina la seguridad de un arnés tradicional con la
              practicidad de una correa retráctil integrada. Diseñado pensando
              en el bienestar de tu perro y la comodidad de uso.
            </p>
          </div>

          {/* Image */}
          <div className="w-full max-w-2xl">
            <div className="relative aspect-square bg-white rounded-lg shadow-lg overflow-hidden">
              <Image
                src="/images/producto.png"
                alt="PawGo Arnés para perros con correa retráctil integrada"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Video/GIF Container */}
          <div className="w-full max-w-4xl">
            <div className="relative aspect-video bg-gray-100 rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
              {/* Placeholder para GIF/VIDEO */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <p className="text-text-dark-gray text-lg md:text-xl font-medium">
                  GIF/VIDEO
                </p>
              </div>
              {/* Aquí puedes agregar un componente <video> o <img> para GIF */}
              {/* Ejemplo para video:
              <video
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                muted
                playsInline
              >
                <source src="/videos/producto.mp4" type="video/mp4" />
              </video>
              */}
              {/* Ejemplo para GIF:
              <Image
                src="/images/producto.gif"
                alt="PawGo Producto en acción"
                fill
                className="object-cover"
              />
              */}
            </div>
          </div>

          {/* Size Guide */}
          <div className="w-full max-w-3xl">
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-text-black text-center mb-4">
                Guía de Tallas
              </h3>
              <p className="text-center text-text-dark-gray mb-6">
                Revisa las medidas para elegir el tamaño correcto para tu perro
              </p>
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-50">
                <Image
                  src="/images/medidas.png"
                  alt="Guía de tallas PawGo - Medidas para perros pequeños, medianos, grandes y extra grandes"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 80vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
