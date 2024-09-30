import { FC, useState } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import { TokenUtils } from '../utils/TokenUtils';

// Dynamically import WalletMultiButton to avoid SSR issues
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const AppBar: FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null); // State to hold the converted amount

  const tokenUtils = new TokenUtils();

  const toggleDropdown = () => setIsCountryDropdownOpen(!isCountryDropdownOpen);

  // Handle country selection
  const selectCountry = async (countryCode: string) => {
    setSelectedCountry(countryCode);
    setIsCountryDropdownOpen(false);

    // Get the flag URL for the selected country
    const selectedCountryData = countries.find(country => country.code === countryCode);
    if (selectedCountryData) {
      await saveFlagToFile(selectedCountryData.name);
    }
  };

  // Save flag URL to an external file
  const saveFlagToFile = async (flagUrl: string) => {
    try {
      const response = await fetch('/api/saveFlag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flagUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to save flag URL');
      }

      console.log('Flag URL saved successfully');
    } catch (error) {
      console.error('Error saving flag URL:', error);
    }
  };

  // Country data
  const countries = [
    { code: 'ZA', name: 'South Africa', flag: 'https://flagcdn.com/w20/za.png' },
    { code: 'US', name: 'United States', flag: 'https://flagcdn.com/w20/us.png' },
    { code: 'GB', name: 'United Kingdom', flag: 'https://flagcdn.com/w20/gb.png' },
    { code: 'EU', name: 'European Union', flag: 'https://flagcdn.com/w20/eu.png' },
    { code: 'JP', name: 'Japan', flag: 'https://flagcdn.com/w20/jp.png' },
    { code: 'CN', name: 'China', flag: 'https://flagcdn.com/w20/cn.png' },
    { code: 'IN', name: 'India', flag: 'https://flagcdn.com/w20/in.png' },
  ];

  // Find selected country
  const selectedCountryData = countries.find(country => country.code === selectedCountry);

  return (
    <div>
      <div className="navbar flex h-20 flex-row md:mb-2 shadow-lg bg-gray-800 text-neutral-content border-b border-zinc-600 bg-opacity-66 relative">
        <div className="navbar-start align-items-center">
          <div className="hidden sm:inline w-22 h-22 md:p-2 ml-10">
            <Link href="https://solana.com" target="_blank" rel="noopener noreferrer" passHref>
              <svg
                width="105%"
                height="24"
                viewBox="0 0 646 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
              </svg>
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-white text-2xl md:text-4xl font-bold">Voucher Vault</h1>
          <p className="text-white text-sm md:text-base mt-2">A Blockchain Voucher Program</p>
        </div>

        <div className="inline-flex align-items-center justify-items gap-6 ml-auto">
          {/* Country Dropdown Button */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none"
            >
              <span className="font-medium">{selectedCountryData?.name || 'Select Country'}</span>
              <img src={selectedCountryData?.flag || 'https://flagcdn.com/w20/za.png'} alt={selectedCountryData?.name || 'Country Flag'} className="w-6 h-4" />
            </button>
            {isCountryDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-lg z-50">
                {countries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => selectCountry(country.code)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span className="font-medium">{country.name}</span>
                    <img src={country.flag} alt={country.name} className="w-6 h-4 inline-block" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {convertedAmount !== null && (
            <span className="text-white px-4 py-2">
              Converted Amount: {convertedAmount} {selectedCountryData?.name || selectedCountry}
            </span>
          )}

          <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-lg mr-6 bg-green-600 text-white" />
        </div>

        <label
          htmlFor="my-drawer"
          className="btn-gh items-center justify-between md:hidden mr-6"
          onClick={() => setIsNavOpen(!isNavOpen)}
        >
          <div className="HAMBURGER-ICON space-y-2.5 ml-5">
            <div className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? 'hidden' : ''}`} />
            <div className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? 'hidden' : ''}`} />
            <div className={`h-0.5 w-8 bg-purple-600 ${isNavOpen ? 'hidden' : ''}`} />
          </div>
          <div
            className={`absolute block h-0.5 w-8 animate-pulse bg-purple-600 ${isNavOpen ? "" : "hidden"}`}
            style={{ transform: isNavOpen ? "rotate(45deg)" : "rotate(0)" }}
          />
        </label>
      </div>

      {isNavOpen && (
        <div className="md:hidden flex flex-col items-start bg-gray-800 text-white p-4 absolute top-20 left-0 w-full shadow-lg">
        </div>
      )}
    </div>
  );
};

export default AppBar;
