import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchEmployees, loginEmployee } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetchEmployees({ is_active: 1 });
      const list = res.data || [];
      setAllEmployees(list);

      // Check saved user in localStorage
      const savedUserJson = localStorage.getItem('biotrack_active_user');
      if (savedUserJson) {
        try {
          const parsed = JSON.parse(savedUserJson);
          const found = list.find(e => e.id === parsed.id);
          if (found) {
            setCurrentUser(found);
            return;
          }
        } catch (e) {}
      }

      // Default to first Biomedical Engineer or admin
      if (list.length > 0) {
        const defaultUser = list.find(e => e.username === 'hassan.bme') || list[0];
        setCurrentUser(defaultUser);
        localStorage.setItem('biotrack_active_user', JSON.stringify(defaultUser));
      }
    } catch (err) {
      console.error('Error loading employees in AuthContext:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchUser = (employee) => {
    setCurrentUser(employee);
    localStorage.setItem('biotrack_active_user', JSON.stringify(employee));
  };

  const loginWithCredentials = async (username, password) => {
    const res = await loginEmployee(username, password);
    if (res.status === 'success' && res.employee) {
      setCurrentUser(res.employee);
      localStorage.setItem('biotrack_active_user', JSON.stringify(res.employee));
      return res.employee;
    }
    throw new Error(res.message || 'Authentication failed');
  };

  const refreshEmployees = () => {
    loadEmployees();
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      allEmployees,
      switchUser,
      loginWithCredentials,
      refreshEmployees,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
