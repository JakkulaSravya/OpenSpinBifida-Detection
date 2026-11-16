import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config';

const AuthContext = createContext(null);
const API = getApiUrl();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('sb_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            const stored = localStorage.getItem('sb_user');
            if (stored) {
                try { setUser(JSON.parse(stored)); } catch { }
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, role) => {
        const res = await axios.post(`${API}/auth/login`, { email, password, role });
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('sb_token', res.data.token);
        localStorage.setItem('sb_user', JSON.stringify(res.data.user));
        return res.data;
    };

    const register = async (data) => {
        const res = await axios.post(`${API}/auth/register`, data);
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('sb_token', res.data.token);
        localStorage.setItem('sb_user', JSON.stringify(res.data.user));
        return res.data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_user');
    };

    const api = axios.create({
        baseURL: API,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, api }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
