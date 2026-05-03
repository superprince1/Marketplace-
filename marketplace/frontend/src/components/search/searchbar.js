import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef();

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await API.get(`/search/autocomplete?q=${query}`);
        setSuggestions(res.data.suggestions);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>🔍</button>
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <ul style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => { setQuery(s); navigate(`/search?q=${encodeURIComponent(s)}`); }} style={styles.suggestionItem}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  container: { position: 'relative', width: '100%', maxWidth: '400px' },
  form: { display: 'flex' },
  input: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', outline: 'none' },
  button: { padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' },
  suggestions: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', listStyle: 'none', margin: 0, padding: 0, zIndex: 10 },
  suggestionItem: { padding: '8px', cursor: 'pointer', ':hover': { backgroundColor: '#f0f0f0' } },
};

export default SearchBar;