import React, { useState } from 'react';
import { Grid, Button, Typography, CircularProgress, Box } from '@mui/material';
import { pinFileToIPFS } from '../utils/uri';

interface ImageUploadPreviewProps {
    setVoucherImage: (file: File | null) => void;
    setVoucherImageHash: (hash: string | null) => void;
    setErrorMessage: (message: string) => void;
    setShowErrorPopup: (show: boolean) => void;
}

const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
    setVoucherImage,
    setVoucherImageHash,
    setErrorMessage,
    setShowErrorPopup
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setVoucherImage(file);
            setIsUploading(true);

            try {
                const ipfsHash = await pinFileToIPFS(file, "VoucherImage");
                console.log("File uploaded to IPFS. Hash:", ipfsHash);
                setVoucherImageHash(ipfsHash);

                // Create a preview URL
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrl(reader.result as string);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error("Error uploading to IPFS:", error);
                setErrorMessage("Failed to upload image to IPFS");
                setShowErrorPopup(true);
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <Grid item xs={12} textAlign='center'>
            <Button
                variant='contained'
                component='label'
                size='large'
                style={{
                    width: '50%',
                    backgroundColor: '#82b6cf',
                    color: '#fff',
                }}
                disabled={isUploading}
            >
                {isUploading ? 'Uploading...' : 'Upload Voucher Image'}
                <input
                    type='file'
                    hidden
                    accept='image/*'
                    onChange={handleImageUpload}
                    disabled={isUploading}
                />
            </Button>
            {isUploading && (
                <Box mt={2}>
                    <CircularProgress />
                </Box>
            )}
            {previewUrl && (
                <Box mt={2} textAlign='center'> {/* Add textAlign='center' */}
                    <Typography variant='body2' style={{ marginBottom: '1rem' }}>
                        Image Preview:
                    </Typography>
                    <img src={previewUrl} alt="Voucher Preview" style={{ maxWidth: '100%', maxHeight: '200px', margin: '0 auto' }} /> {/* Add margin: '0 auto' */}
                </Box>
            )}
        </Grid>
    );
};

export default ImageUploadPreview;