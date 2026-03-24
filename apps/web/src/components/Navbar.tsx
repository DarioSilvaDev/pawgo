import Link from 'next/link';

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1c1e]/80 backdrop-blur-md border-b border-white/5">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
                <Link href="/" className="group flex items-center gap-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-turquoise to-primary-turquoise-light bg-clip-text text-transparent transition-all duration-300 group-hover:tracking-wider">
                        PawGo
                    </h1>
                </Link>
                <div className="flex gap-8 items-center">
                    <Link
                        href="https://www.pawgo-pet.com/comunidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium bg-primary-turquoise/10 hover:bg-primary-turquoise/20 text-primary-turquoise px-4 py-2 rounded-full border border-primary-turquoise/20 transition-all"
                    >
                        Comunidad 🐾
                    </Link>
                </div>
            </div>
        </nav>
    );
}
