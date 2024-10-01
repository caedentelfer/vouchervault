import { FC } from 'react';

export const Footer: FC = () => {
    return (
        <div className="flex">
            <footer className="border-t-2 border-[#141414] bg-gray-800 text-white w-screen py-6">
                <div className="flex flex-col items-center mx-12">
                    <div className="text-center mb-4">
                        <h5 className="font-normal text-lg mb-2.5">DEVELOPERS</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                            <div><a href="mailto:26296918@sun.ac.za" className="hover:text-blue-500">26296918@sun.ac.za</a> - David</div>
                            <div><a href="mailto:25526693@sun.ac.za" className="hover:text-blue-500">25526693@sun.ac.za</a> - Caeden</div>
                            <div><a href="mailto:25849611@sun.ac.za" className="hover:text-blue-500">25849611@sun.ac.za</a> - Luke</div>
                            <div><a href="mailto:26429659@sun.ac.za" className="hover:text-blue-500">26429659@sun.ac.za</a> - Izak</div>
                            <div><a href="mailto:25526693@sun.ac.za" className="hover:text-blue-500">26259877@sun.ac.za</a> - Yedidia</div>
        
                        </div>
                    </div>
                    <div className="flex justify-between w-full">
                        <div className="text-lg ml-auto">
                            Powered by<br />Solana
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
