import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import Select from 'react-select';
import API from '../services/api';

const CurrencySelector = () => {
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await API.get('/currency/supported');
        const currencies = res.data.currencies;
        const options = currencies.map(code => ({ value: code, label: code }));
        setCurrencyOptions(options);

        // Determine initial selected currency
        let initialCurrency = localStorage.getItem('preferredCurrency') || Cookies.get('currency');
        if (initialCurrency && currencies.includes(initialCurrency)) {
          setSelectedCurrency({ value: initialCurrency, label: initialCurrency });
          setLoading(false);
          return;
        }

        // Detect from IP
        const detectRes = await API.get('/currency/detect');
        const detected = detectRes.data.currency;
        if (currencies.includes(detected)) {
          setSelectedCurrency({ value: detected, label: detected });
          localStorage.setItem('preferredCurrency', detected);
          Cookies.set('currency', detected, { expires: 365 });
          window.location.reload();
        } else {
          // Fallback to USD
          setSelectedCurrency({ value: 'USD', label: 'USD' });
        }
      } catch (err) {
        console.error('Failed to load currencies:', err);
        // Fallback to basic list
        const fallback = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF'];
        setCurrencyOptions(fallback.map(c => ({ value: c, label: c })));
        setSelectedCurrency({ value: 'USD', label: 'USD' });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  const handleChange = (selected) => {
    if (!selected) return;
    const newCurrency = selected.value;
    setSelectedCurrency(selected);
    localStorage.setItem('preferredCurrency', newCurrency);
    Cookies.set('currency', newCurrency, { expires: 365 });
    window.location.reload();
  };

  if (loading) return <div style={styles.loading}>Loading currencies...</div>;

  return (
    <Select
      options={currencyOptions}
      value={selectedCurrency}
      onChange={handleChange}
      isSearchable
      placeholder="Currency"
      styles={customStyles}
    />
  );
};

const customStyles = {
  control: (provided) => ({
    ...provided,
    minWidth: '120px',
    backgroundColor: '#fff',
    borderColor: '#ccc',
    boxShadow: 'none',
    '&:hover': { borderColor: '#aaa' },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#e9ecef' : 'white',
    color: state.isSelected ? 'white' : '#333',
  }),
};

const styles = {
  loading: {
    fontSize: '12px',
    color: '#888',
    padding: '4px 8px',
  },
};

export default CurrencySelector;