import React from 'react';

const TrainingTable = ({ data, show_validation }) => {
  return (
    <div className="table-container">
      <table className="training-table">
        <thead>
          <tr>
            <th>Epoch</th>
            <th>{(show_validation ? "Validation " : "")}Accuracy</th>
            <th>{(show_validation ? "Validation " : "")}Loss</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{index}</td>
              {!show_validation && <td>{row.accuracy}</td>}
              {!show_validation && <td>{row.loss}</td>}
              {show_validation && <td>{row.val_accuracy}</td>}
              {show_validation && <td>{row.val_loss}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrainingTable;