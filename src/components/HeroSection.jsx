import { Link } from 'react-router-dom'

export default function HeroSection({ type = 'home', title, subtitle, children }) {
    const heroClassMap = {
        home: 'hero-cabanas hero--home',
        cabanas: 'hero-cabanas hero--listing',
        departamentos: 'hero-departamentos hero--listing',
    }

    return (
        <section className={`hero ${heroClassMap[type] || heroClassMap.home}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full hero-content">
                <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 text-primary-300">
                    Arte Brisa Patagonia
                </p>
                <h1 className="hero-title">{title}</h1>
                {subtitle && (
                    <p className="hero-subtitle mt-2">{subtitle}</p>
                )}
                {children}
            </div>
        </section>
    )
}
