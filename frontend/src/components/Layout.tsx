import { Fragment } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';

const baseNavigation = [
  { name: 'Desafios', href: '/explore' },
  { name: 'Carteira', href: '/wallet' },
  { name: 'Perfil', href: '/profile' },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Usuários', href: '/admin/users' },
  { name: 'Desafios', href: '/admin/challenges' },
  { name: 'Saques', href: '/admin/withdrawals' },
  { name: 'Logs', href: '/admin/logs' },
];

export default function Layout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const navigation = [...baseNavigation, ...(user?.is_admin ? adminNavigation : [])];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Disclosure as="nav">
        {({ open }) => (
          <>
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-4 bg-white shadow-soft">
              <div>
                <Link to="/" className="text-3xl font-bold text-cyan-400">desafit</Link>
              </div>
              <nav className="hidden sm:flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={item.href === '/explore' ? "text-cyan-500 hover:text-cyan-700 transition-colors" : "text-gray-600 hover:text-cyan-500 transition-colors"}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="flex space-x-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/notifications" className="rounded-full bg-gray-200 p-2 hover:bg-gray-300 transition-all transform hover:scale-105">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                    </Link>
                    <Menu as="div" className="relative">
                      <Menu.Button className="rounded-full bg-gray-200 p-2 hover:bg-gray-300 transition-all transform hover:scale-105">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white py-1 shadow-soft ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/profile"
                                className={`${
                                  active ? 'bg-gray-50' : ''
                                } block px-4 py-2 text-sm text-gray-700 hover:text-cyan-600`}
                              >
                                Meu Perfil
                              </Link>
                            )}
                          </Menu.Item>
                          {user?.is_admin && (
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  to="/admin"
                                  className={`${
                                    active ? 'bg-gray-50' : ''
                                  } block px-4 py-2 text-sm text-gray-700 hover:text-cyan-600`}
                                >
                                  Painel Admin
                                </Link>
                              )}
                            </Menu.Item>
                          )}
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={`${
                                  active ? 'bg-gray-50' : ''
                                } block w-full px-4 py-2 text-left text-sm text-gray-700 hover:text-cyan-600`}
                              >
                                Sair
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </>
                ) : (
                  <div className="space-x-4">
                    <Link to="/login" className="btn-outline">
                      Entrar
                    </Link>
                    <Link to="/register" className="btn-primary">
                      Cadastrar
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500">
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </header>

            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pb-3 pt-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block py-2 px-3 text-base font-medium text-gray-900 hover:bg-gray-50 hover:text-cyan-600"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              {isAuthenticated ? (
                <div className="border-t border-gray-200 pb-3 pt-4">
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {user?.name}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-cyan-600"
                    >
                      Meu Perfil
                    </Link>
                    {user?.is_admin && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-cyan-600"
                      >
                        Painel Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-cyan-600"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 p-4 space-y-2">
                  <Link
                    to="/login"
                    className="btn-outline w-full text-center"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary w-full text-center"
                  >
                    Cadastrar
                  </Link>
                </div>
              )}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <main className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
} 