import React from "react";

function SeeAll(props) {
  return (
    <div>
      <h1>Most popular Movies</h1>
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-200 h-48 rounded-lg"></div>
          <div className="bg-gray-200 h-48 rounded-lg"></div>
          <div className="bg-gray-200 h-48 rounded-lg"></div>
          <div className="bg-gray-200 h-48 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default SeeAll;
