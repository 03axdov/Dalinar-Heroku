import React from 'react';

const DescriptionTable = ({ data }) => {
  return (
    <div className="table-container description-table-container">
      <table className="training-table description-table">
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td className="description-row-1">{row[0]}</td>
              <td style={{background: "var(--background-darker)"}}>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DescriptionTable;