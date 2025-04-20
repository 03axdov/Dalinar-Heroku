export const customStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: 'var(--background-dark)', // Tailwind's gray-800
      borderColor: 'var(--border)',     // gray-700
      color: 'white',            // gray-100
      width: '100%',               // consistent width
      minHeight: '2.5rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--border)',    // gray-600
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--background-dark)',
      color: 'white',
      zIndex: 100,
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? 'var(--background-lighter)' // gray-600 for selected
          : state.isFocused
          ? 'var(--background-light)' // gray-700 on hover/focus
          : 'var(--background-dark)', // gray-800 default
        color: 'white',
        cursor: 'pointer',
        ':active': {
            backgroundColor: 'var(--background-light)', // suppress white flash on click
        },
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white',
    }),
    groupHeading: (base) => ({
      ...base,
      color: 'white', // gray-300
      fontWeight: 'bold',
      fontSize: '0.875rem',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'white', // gray-400
      '&:hover': {
        color: 'white',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    input: (base) => ({
        ...base,
        color: 'white', // white text while typing
    }),
    placeholder: (base) => ({
        ...base,
        color: '#9ca3af', // gray placeholder
    }),
    container: (base) => ({
        ...base,
        width: '100%',
        marginLeft: "20px"
    }),
    menuList: (base) => ({
        ...base,
        maxHeight: '400px',            // limits height (scroll appears here)
        scrollbarWidth: 'thin',        // Firefox
        overflowY: 'auto',
        // Scrollbar for WebKit (Chrome, Safari)
        '::-webkit-scrollbar': {
          width: '6px',
        },
        '::-webkit-scrollbar-track': {
          background: '#1f2937',       // match dark background
        },
        '::-webkit-scrollbar-thumb': {
          background: '#4b5563',
          borderRadius: '4px',
        },
    }),
};

export const customStylesNoMargin = {
    ...customStyles,
    container: (base) => ({
        ...base,
        width: '100%',
        marginLeft: "0"
    }),
  };