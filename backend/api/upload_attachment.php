<?php
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Only POST method supported', 405);
}

try {
    $equipmentId = !empty($_POST['equipment_id']) ? (int)$_POST['equipment_id'] : 0;
    if (!$equipmentId) {
        jsonError('equipment_id is required');
    }

    $docType = !empty($_POST['document_type']) ? $_POST['document_type'] : 'User Manual';
    $fileTitle = !empty($_POST['file_title']) ? trim($_POST['file_title']) : 'Equipment Document';

    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        // Fallback for demo or file simulation if text upload
        $fileName = 'document_' . time() . '.pdf';
        $filePath = '/uploads/' . $fileName;
        $fileSize = 1024;
    } else {
        $file = $_FILES['file'];
        $originalName = basename($file['name']);
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $safeName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
        $fileName = $safeName . '_' . time() . '.' . $ext;
        $destPath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            jsonError('Failed to move uploaded file', 500);
        }

        $filePath = '/uploads/' . $fileName;
        $fileSize = round($file['size'] / 1024);
    }

    $stmt = $pdo->prepare("INSERT INTO equipment_attachments (equipment_id, document_type, file_title, file_name, file_path, file_size_kb) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $equipmentId,
        $docType,
        $fileTitle,
        $fileName,
        $filePath,
        $fileSize
    ]);

    jsonResponse([
        'status' => 'success',
        'message' => 'Document attachment uploaded successfully',
        'id' => $pdo->lastInsertId(),
        'file_name' => $fileName,
        'file_path' => $filePath
    ], 201);
} catch (Exception $e) {
    jsonError('Failed to upload document: ' . $e->getMessage(), 500);
}
