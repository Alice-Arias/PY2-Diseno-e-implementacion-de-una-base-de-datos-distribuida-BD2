import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // "/clientes" -> "clientes"
    const current = location.pathname.split('/')[1];

    return (
        <div className="app-shell">

            <Sidebar
                current={current}
                onNavigate={(page) => navigate(`/${page}`)}
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Topbar />

                <div className="content">
                    <Outlet />
                </div>
            </div>

        </div>
    );
}

export default MainLayout;