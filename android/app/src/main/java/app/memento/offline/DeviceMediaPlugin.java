package app.memento.offline;

import android.Manifest;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Size;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(
    name = "DeviceMedia",
    permissions = {
        @Permission(
            alias = "images",
            strings = { Manifest.permission.READ_MEDIA_IMAGES }
        ),
        @Permission(
            alias = "videos",
            strings = { Manifest.permission.READ_MEDIA_VIDEO }
        ),
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        )
    }
)
public class DeviceMediaPlugin extends Plugin {

    private boolean isMediaAccessGranted() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean imagesGranted = ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
            boolean videosGranted = ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED;
            return imagesGranted || videosGranted;
        } else {
            return ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void checkMediaPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = isMediaAccessGranted();
        ret.put("granted", granted);
        ret.put("status", granted ? "granted" : "prompt");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMediaPermissions(PluginCall call) {
        if (isMediaAccessGranted()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("status", "granted");
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAliases(new String[] { "images", "videos" }, call, "mediaPermsCallback");
        } else {
            requestPermissionForAliases(new String[] { "storage" }, call, "mediaPermsCallback");
        }
    }

    @PermissionCallback
    private void mediaPermsCallback(PluginCall call) {
        boolean granted = isMediaAccessGranted();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("status", granted ? "granted" : "denied");
        call.resolve(ret);
    }

    @PluginMethod
    public void getDeviceMedia(PluginCall call) {
        String type = call.getString("type", "all");
        int limit = call.getInt("limit", 150);

        JSObject result = new JSObject();
        JSArray imagesArray = new JSArray();
        JSArray videosArray = new JSArray();

        ContentResolver resolver = getContext().getContentResolver();

        // 1. Fetch Images
        if ("all".equals(type) || "images".equals(type)) {
            Uri imagesUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            String[] projection = new String[] {
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.SIZE,
                MediaStore.Images.Media.DATE_ADDED,
                MediaStore.Images.Media.DATE_TAKEN,
                MediaStore.Images.Media.MIME_TYPE,
                MediaStore.Images.Media.WIDTH,
                MediaStore.Images.Media.HEIGHT,
                MediaStore.Images.Media.ORIENTATION
            };
            String sortOrder = MediaStore.Images.Media.DATE_TAKEN + " DESC, " + MediaStore.Images.Media.DATE_ADDED + " DESC";

            try (Cursor cursor = resolver.query(imagesUri, projection, null, null, sortOrder)) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                    int nameCol = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME);
                    int sizeCol = cursor.getColumnIndex(MediaStore.Images.Media.SIZE);
                    int dateAddedCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_ADDED);
                    int dateTakenCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN);
                    int mimeCol = cursor.getColumnIndex(MediaStore.Images.Media.MIME_TYPE);
                    int widthCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH);
                    int heightCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT);
                    int orientCol = cursor.getColumnIndex(MediaStore.Images.Media.ORIENTATION);

                    int count = 0;
                    while (cursor.moveToNext() && count < limit) {
                        long id = cursor.getLong(idCol);
                        String name = nameCol >= 0 ? cursor.getString(nameCol) : null;
                        long size = sizeCol >= 0 ? cursor.getLong(sizeCol) : 0;
                        long dateAdded = dateAddedCol >= 0 ? cursor.getLong(dateAddedCol) : 0;
                        long dateTaken = dateTakenCol >= 0 ? cursor.getLong(dateTakenCol) : 0;
                        String mime = mimeCol >= 0 ? cursor.getString(mimeCol) : "image/jpeg";
                        int width = widthCol >= 0 ? cursor.getInt(widthCol) : 0;
                        int height = heightCol >= 0 ? cursor.getInt(heightCol) : 0;
                        int orient = orientCol >= 0 ? cursor.getInt(orientCol) : 0;

                        long timestamp = dateTaken > 0 ? dateTaken : (dateAdded * 1000L);
                        Uri itemUri = ContentUris.withAppendedId(imagesUri, id);

                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("name", name != null ? name : "IMG_" + id + ".jpg");
                        item.put("size", size);
                        item.put("date", timestamp);
                        item.put("mimeType", mime != null ? mime : "image/jpeg");
                        item.put("type", "photo");
                        item.put("width", width);
                        item.put("height", height);
                        item.put("orientation", orient);
                        item.put("uri", itemUri.toString());

                        String thumb = loadBase64Thumbnail(resolver, itemUri, 200, 200);
                        if (thumb != null) {
                            item.put("thumbnail", thumb);
                        }

                        imagesArray.put(item);
                        count++;
                    }
                }
            } catch (Exception e) {
                Logger.error("DeviceMediaPlugin query images failed", e);
            }
        }

        // 2. Fetch Videos
        if ("all".equals(type) || "videos".equals(type)) {
            Uri videosUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            String[] projection = new String[] {
                MediaStore.Video.Media._ID,
                MediaStore.Video.Media.DISPLAY_NAME,
                MediaStore.Video.Media.SIZE,
                MediaStore.Video.Media.DATE_ADDED,
                MediaStore.Video.Media.DATE_TAKEN,
                MediaStore.Video.Media.MIME_TYPE,
                MediaStore.Video.Media.DURATION,
                MediaStore.Video.Media.WIDTH,
                MediaStore.Video.Media.HEIGHT
            };
            String sortOrder = MediaStore.Video.Media.DATE_TAKEN + " DESC, " + MediaStore.Video.Media.DATE_ADDED + " DESC";

            try (Cursor cursor = resolver.query(videosUri, projection, null, null, sortOrder)) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID);
                    int nameCol = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME);
                    int sizeCol = cursor.getColumnIndex(MediaStore.Video.Media.SIZE);
                    int dateAddedCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_ADDED);
                    int dateTakenCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_TAKEN);
                    int mimeCol = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE);
                    int durCol = cursor.getColumnIndex(MediaStore.Video.Media.DURATION);
                    int widthCol = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH);
                    int heightCol = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT);

                    int count = 0;
                    while (cursor.moveToNext() && count < limit) {
                        long id = cursor.getLong(idCol);
                        String name = nameCol >= 0 ? cursor.getString(nameCol) : null;
                        long size = sizeCol >= 0 ? cursor.getLong(sizeCol) : 0;
                        long dateAdded = dateAddedCol >= 0 ? cursor.getLong(dateAddedCol) : 0;
                        long dateTaken = dateTakenCol >= 0 ? cursor.getLong(dateTakenCol) : 0;
                        String mime = mimeCol >= 0 ? cursor.getString(mimeCol) : "video/mp4";
                        long duration = durCol >= 0 ? cursor.getLong(durCol) : 0;
                        int width = widthCol >= 0 ? cursor.getInt(widthCol) : 0;
                        int height = heightCol >= 0 ? cursor.getInt(heightCol) : 0;

                        long timestamp = dateTaken > 0 ? dateTaken : (dateAdded * 1000L);
                        Uri itemUri = ContentUris.withAppendedId(videosUri, id);

                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("name", name != null ? name : "VID_" + id + ".mp4");
                        item.put("size", size);
                        item.put("date", timestamp);
                        item.put("mimeType", mime != null ? mime : "video/mp4");
                        item.put("duration", duration);
                        item.put("width", width);
                        item.put("height", height);
                        item.put("type", "video");
                        item.put("uri", itemUri.toString());

                        String thumb = loadBase64Thumbnail(resolver, itemUri, 200, 200);
                        if (thumb != null) {
                            item.put("thumbnail", thumb);
                        }

                        videosArray.put(item);
                        count++;
                    }
                }
            } catch (Exception e) {
                Logger.error("DeviceMediaPlugin query videos failed", e);
            }
        }

        result.put("images", imagesArray);
        result.put("videos", videosArray);
        call.resolve(result);
    }

    private String loadBase64Thumbnail(ContentResolver resolver, Uri uri, int w, int h) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Bitmap bmp = resolver.loadThumbnail(uri, new Size(w, h), null);
                if (bmp != null) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bmp.compress(Bitmap.CompressFormat.JPEG, 70, baos);
                    bmp.recycle();
                    byte[] bytes = baos.toByteArray();
                    return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                }
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    @PluginMethod
    public void openNearbyServices(PluginCall call) {
        String text = call.getString("text", "Memento — Share memories offline");
        String title = call.getString("title", "Quick Share / Nearby");

        Context ctx = getContext();
        try {
            // Attempt Google Play Services direct Nearby / Quick Share activity
            Intent directIntent = new Intent();
            directIntent.setAction(Intent.ACTION_SEND);
            directIntent.setType("text/plain");
            directIntent.putExtra(Intent.EXTRA_TEXT, text);
            directIntent.setComponent(new ComponentName(
                "com.google.android.gms",
                "com.google.android.gms.nearby.sharing.ShareSheetActivity"
            ));
            directIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(directIntent);

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("method", "quick_share_direct");
            call.resolve(res);
            return;
        } catch (Throwable directEx) {
            // Fallback to Android system share sheet with Quick Share / Nearby pinned at top
            try {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                Intent chooser = Intent.createChooser(sendIntent, title);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(chooser);

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("method", "system_chooser");
                call.resolve(res);
            } catch (Throwable chooserEx) {
                call.reject("Could not launch nearby services: " + chooserEx.getMessage());
            }
        }
    }
}
