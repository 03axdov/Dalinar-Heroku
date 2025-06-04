import React from 'react';

const DescriptionTable = ({ data }) => {
  return (
    <div className="table-container description-table-container">
      <table className="training-table description-table">
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td className="description-row-1 gray-text">
                {row[0]}
              </td>
              <td>
                {row[0].toLowerCase() === "owner" && <a href={"/all/accounts/" + row[1]} target="_blank" style={{color: "white", display: "flex", alignItems: "center"}}>
                  {row[1]}
                  
                </a>}
                {row[0].toLowerCase() !== "owner" && row[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DescriptionTable;