<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check for file upload
    if (isset($_FILES['audio_file']) && $_FILES['audio_file']['error'] === UPLOAD_ERR_OK) {
        $clipStart   = (int)($_POST['clip_start'] ?? 0);
        $clipDuration = 30; // clip duration

        // Path to the temporary uploaded file
        $tmpPath = $_FILES['audio_file']['tmp_name'];

        // Build folder and file name based on song title and artist.
        $songTitle = $_POST['song_title'] ?? '';
        $artist    = $_POST['artist'] ?? '';
        // Create a base slug: replace all non-alphanumeric characters with underscores
        $baseSlug  = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $songTitle . '_' . $artist));
        // Remove leading or trailing underscores
        $baseSlug  = trim($baseSlug, '_');
        // Fallback for an empty slug
        if ($baseSlug === '') {
            $baseSlug = 'track_' . time();
        }

        // Directory to save the clip and info
        $folderName = $baseSlug;
        $uploadDir  = __DIR__ . '/uploads/' . $folderName;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Clip filename: base slug + .mp3
        $clipPath = $uploadDir . '/' . $baseSlug . '.mp3';

        // Trim the audio using ffmpeg (must be installed on the server)
        $cmd = sprintf(
            'ffmpeg -i %s -ss %d -t %d -acodec libmp3lame -y %s',
            escapeshellarg($tmpPath),
            $clipStart,
            $clipDuration,
            escapeshellarg($clipPath)
        );
        exec($cmd, $out, $returnVar);

        // Prepare info.json
        $info = [
            'genre'          => $_POST['genre'] ?? '',
            'spotify'        => $_POST['spotify'] ?? '',
            'youtube_music'  => $_POST['youtube_music'] ?? '',
            'apple_music'    => $_POST['apple_music'] ?? '',
            'amazon_music'   => $_POST['amazon_music'] ?? ''
        ];
        
        // FIX: Create info.json WITHOUT escaped slashes in URLs
        $infoJson = json_encode($info, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        
        file_put_contents($uploadDir . '/info.json', $infoJson);

        echo 'File processed and saved successfully.';
    } else {
        echo 'Error uploading file.';
    }
}
?>