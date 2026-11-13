import * as ImagePicker from 'expo-image-picker';
import apiClient from '@/core/api/client';
import { Env } from '@/core/config/env';

const ASSETS_URL = process.env.EXPO_PUBLIC_COURTS_URL || Env.API_URL;

interface UploadUrlResponse {
    upload_url: string;
    public_url: string;
    s3_key: string;
    expires_in: number;
}

const unwrap = (response: unknown): UploadUrlResponse => {
    let data: unknown = response;
    if (data && typeof data === 'object' && 'data' in data) {
        data = (data as { data: unknown }).data;
    }
    if (data && typeof data === 'object' && 'body' in data) {
        const body = (data as { body: unknown }).body;
        data = typeof body === 'string' ? JSON.parse(body) : body;
    }
    return data as UploadUrlResponse;
};

export const CourtUploadService = {
    async pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return null;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.82,
        });

        if (result.canceled || !result.assets?.length) return null;
        return result.assets[0];
    },

    async uploadImage(asset: ImagePicker.ImagePickerAsset): Promise<string> {
        const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');
        const fileName = `court-${Date.now()}.${extension}`;

        const response = await apiClient.post(`${ASSETS_URL}/assets/upload-url`, {
            asset_type: 'other',
            file_name: fileName,
            content_type: mimeType,
        });
        const upload = unwrap(response);

        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();
        const putResponse = await fetch(upload.upload_url, {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: blob,
        });

        if (!putResponse.ok) {
            const errorText = await putResponse.text();
            throw new Error(errorText || `No se pudo subir la imagen (${putResponse.status}).`);
        }

        return upload.public_url;
    },

    async pickAndUpload(): Promise<string | null> {
        const asset = await this.pickImage();
        if (!asset) return null;
        return this.uploadImage(asset);
    },
};
