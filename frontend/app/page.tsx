export default function Home() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>FluxERP - AI-First PLM System</h1>
            <p>Welcome to FluxERP. Please login to continue.</p>
            <div style={{ marginTop: '2rem' }}>
                <a href="/login" style={{ padding: '1rem 2rem', background: '#0070f3', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
                    Login
                </a>
            </div>
        </div>
    );
}
