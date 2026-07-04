export const getInitialDarkTheme = (): boolean => {
  const savedTheme = localStorage.getItem('mimic-theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const watchPreferredTheme = (onChange: (darkTheme: boolean) => void): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (localStorage.getItem('mimic-theme') === null) {
      onChange(mediaQuery.matches);
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
};

export const applyDocumentTheme = (darkTheme: boolean): void => {
  document.documentElement.classList.toggle('mimic-dark', darkTheme);
  document.body.classList.toggle('mimic-dark', darkTheme);
  document.documentElement.style.backgroundColor = darkTheme ? '#101418' : '#e9eef1';
  document.body.style.backgroundColor = darkTheme ? '#101418' : '#e9eef1';
  document.body.style.color = darkTheme ? '#f4f7f8' : '#101418';
};
