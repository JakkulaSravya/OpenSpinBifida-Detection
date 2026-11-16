export default function Navbar({ title }) {
    return (
        <header className="navbar">
            <h1 className="navbar-title">{title}</h1>
            <div className="navbar-actions"></div>
        </header>
    );
}
