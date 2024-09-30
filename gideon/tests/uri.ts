// Setup for contacting Pinata API
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDUwZDFiNi01ODE4LTRlYTgtYWM2ZC0yYjRiZDg4ODE1MmEiLCJlbWFpbCI6ImRhdmlkdG5pY29sYXlAbGl2ZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMmE1NTk0MDMzYzY5MTcyMGY1YjMiLCJzY29wZWRLZXlTZWNyZXQiOiI4YThhMzM5OTdjZDc0NjkyZjllMDcwYWQwYmM0YzU2YTZlYjQ5M2E4MDVkN2ZkNTkyMWFjZjEwNWVhZGIwMDc1IiwiaWF0IjoxNzIzMDYxNTgxfQ.Zam9pQeaH57MNm6v_JfvwqLrgADKfyawddoGk-Cp15Y'

export const pinFileToIPFS = async (fileName: string, title: string): Promise<string> => {
    const filePath = path.join(__dirname, fileName);
    const formData = new FormData();
    const file = fs.createReadStream(filePath);
    formData.append('file', file);
  
    const pinataMetadata = JSON.stringify({
      name: `${title} Image`,
    });
    formData.append('pinataMetadata', pinataMetadata);
  
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);
  
    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'Authorization': `Bearer ${JWT}`
        }
      });
      console.log(res.data);
      return res.data.IpfsHash; // Return the IPFS hash
    } catch (error) {
      console.error("Error uploading file to IPFS:", error);
      throw error;
    }
};

export const pinJSONToIPFS = async (json: any, title: string): Promise<string> => {
    const pinataMetadata = JSON.stringify({
      name: `${title} JSON`,
    });
  
    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", json, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT}`
        }
      });
      console.log(res.data);
      return res.data.IpfsHash; // Return the IPFS hash
    } catch (error) {
      console.error("Error uploading JSON to IPFS:", error);
      throw error;
    }
}
