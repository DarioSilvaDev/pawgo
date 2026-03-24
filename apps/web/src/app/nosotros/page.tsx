import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Nosotros() {
    return (
        <main className="min-h-screen bg-[#111214] text-gray-300">
            <Navbar />
            
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden text-center">
                <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary-turquoise/10 to-transparent blur-[120px] -z-10"></div>
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Nuestra Historia</h2>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Nacimos de la pasión por la aventura y el compromiso inquebrantable con el bienestar de nuestros compañeros peludos.
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-20 bg-[#1a1c1e]/50 backdrop-blur-sm">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary-turquoise to-primary-turquoise-light bg-clip-text text-transparent">
                                Nuestra Misión
                            </h3>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                Transformar cada paseo en una experiencia de conexión, seguridad y confort. Desarrollamos equipamiento premium que integra tecnología innovadora con un diseño ergonómico, permitiendo que humanos y mascotas exploren el mundo sin límites.
                            </p>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary-turquoise to-primary-turquoise-dark rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-[#1a1c1e] p-10 rounded-2xl border border-white/5 shadow-2xl">
                                <h3 className="text-3xl font-bold text-white mb-6">Nuestra Visión</h3>
                                <p className="text-lg text-gray-400 leading-relaxed">
                                    Ser la marca líder en Argentina reconocida por la innovación en accesorios para mascotas, fomentando una comunidad global de &quot;pet explorers&quot; que valoran la calidad y la durabilidad.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center mb-16">
                        <h4 className="text-primary-turquoise font-semibold uppercase tracking-widest text-sm mb-2">Valores</h4>
                        <h3 className="text-3xl md:text-4xl font-bold text-white">Lo que nos impulsa</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "Innovación", desc: "Redefinimos lo convencional a través de tecnología aplicada al diseño ergonómico." },
                            { title: "Compromiso", desc: "Cada producto es testeado para garantizar la máxima seguridad de tu mascota." },
                            { title: "Comunidad", desc: "Construimos espacios para compartir aventuras y conocimientos sobre el mundo canino." }
                        ].map((v, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-turquoise/30 transition-all duration-300 group hover:-translate-y-2">
                                <h5 className="text-xl font-bold text-white mb-4 group-hover:text-primary-turquoise transition-colors">{v.title}</h5>
                                <p className="text-gray-400 leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
