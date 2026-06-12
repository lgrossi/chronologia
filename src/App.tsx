import { Routes, Route, NavLink } from 'react-router-dom';

/**
 * Minimal compiling router shell. Each route renders a placeholder; later
 * phases replace these with the real screens (Hoje, Linha, Tendências, Perfil).
 */

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-paper px-5 pt-14 pb-24 font-sans text-ink">
      <h1 className="font-display text-2xl font-bold">{name}</h1>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Hoje' },
  { to: '/linha', label: 'Linha' },
  { to: '/tendencias', label: 'Tendências' },
  { to: '/perfil', label: 'Perfil' },
];

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Placeholder name="Hoje" />} />
        <Route path="/linha" element={<Placeholder name="Linha do tempo" />} />
        <Route path="/tendencias" element={<Placeholder name="Tendências" />} />
        <Route path="/perfil" element={<Placeholder name="Perfil" />} />
      </Routes>

      <nav className="fixed inset-x-0 bottom-0 safe-bottom flex justify-around border-t border-line bg-card shadow-tabbar">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 py-3 text-center font-sans text-xs ${
                isActive ? 'text-accent' : 'text-ink-faint'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
