import React from 'react';

export default function TestComponent() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Tailwind CSS Test</h1>
        <p className="text-gray-600 mb-4">
          If you can see this styled component, Tailwind CSS is working correctly!
        </p>
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
          Test Button
        </button>
      </div>
    </div>
  );
}
