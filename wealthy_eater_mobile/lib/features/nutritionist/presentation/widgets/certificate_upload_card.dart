// ignore_for_file: use_build_context_synchronously

import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

/// Widget for uploading certification (file, bytes, or URL)
/// Supports PDF, JPG, PNG files or certificate URL across Web, Mobile & Desktop
class CertificateUploadCard extends StatefulWidget {
  final Function(File?)? onFileSelected;
  final Function(Uint8List?, String?)? onBytesSelected;
  final Function(String?)? onUrlSelected;
  final File? selectedFile;
  final String? selectedUrl;

  const CertificateUploadCard({
    super.key,
    this.onFileSelected,
    this.onBytesSelected,
    this.onUrlSelected,
    this.selectedFile,
    this.selectedUrl,
  });

  @override
  State<CertificateUploadCard> createState() => _CertificateUploadCardState();
}

class _CertificateUploadCardState extends State<CertificateUploadCard> {
  File? _selectedFile;
  Uint8List? _selectedBytes;
  String? _selectedFileName;
  String? _selectedUrl;
  bool _showUrlInput = false;

  @override
  void initState() {
    super.initState();
    _selectedFile = widget.selectedFile;
    _selectedUrl = widget.selectedUrl;
    _showUrlInput = widget.selectedUrl != null && widget.selectedUrl!.isNotEmpty;
  }

  bool get _isImage {
    final name = (_selectedFileName ?? _selectedFile?.path ?? _selectedUrl ?? '').toLowerCase();
    return name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.contains('image');
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        withData: true, // Crucial for Web and thumbnail generation
      );

      if (result != null && result.files.isNotEmpty) {
        final platformFile = result.files.first;
        final bytes = platformFile.bytes;
        final name = platformFile.name;
        File? file;
        if (!kIsWeb && platformFile.path != null) {
          file = File(platformFile.path!);
        }

        setState(() {
          _selectedFile = file;
          _selectedBytes = bytes;
          _selectedFileName = name;
          _selectedUrl = null;
          _showUrlInput = false;
        });

        widget.onBytesSelected?.call(bytes, name);
        widget.onFileSelected?.call(file);
        widget.onUrlSelected?.call(null);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking file: $e')),
        );
      }
    }
  }

  Future<void> _pickImageFromCamera() async {
    try {
      final image = await ImagePicker().pickImage(source: ImageSource.camera);
      if (image != null) {
        final bytes = await image.readAsBytes();
        final name = image.name;
        File? file;
        if (!kIsWeb) {
          file = File(image.path);
        }

        setState(() {
          _selectedFile = file;
          _selectedBytes = bytes;
          _selectedFileName = name;
          _selectedUrl = null;
          _showUrlInput = false;
        });

        widget.onBytesSelected?.call(bytes, name);
        widget.onFileSelected?.call(file);
        widget.onUrlSelected?.call(null);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error capturing image: $e')),
        );
      }
    }
  }

  void _updateUrl(String url) {
    final trimmed = url.trim();
    setState(() {
      _selectedUrl = trimmed.isNotEmpty ? trimmed : null;
      _selectedFile = null;
      _selectedBytes = null;
      _selectedFileName = null;
    });
    widget.onUrlSelected?.call(trimmed.isNotEmpty ? trimmed : null);
    widget.onBytesSelected?.call(null, null);
    widget.onFileSelected?.call(null);
  }

  void _toggleUrlInput() {
    setState(() {
      _showUrlInput = !_showUrlInput;
      if (!_showUrlInput) {
        _selectedUrl = null;
        widget.onUrlSelected?.call(null);
      }
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedFile = null;
      _selectedBytes = null;
      _selectedFileName = null;
      _selectedUrl = null;
    });
    widget.onFileSelected?.call(null);
    widget.onBytesSelected?.call(null, null);
    widget.onUrlSelected?.call(null);
  }

  @override
  Widget build(BuildContext context) {
    final hasFile = _selectedBytes != null || _selectedFile != null;
    final hasUrl = _selectedUrl != null && _selectedUrl!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Upload Certification *',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 10),

        // ── Main File Upload Card ───────────────────────────────────────
        Container(
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            border: Border.all(
              color: (hasFile || hasUrl) ? Colors.green.shade400 : Colors.grey.shade300,
              width: (hasFile || hasUrl) ? 1.5 : 1.0,
            ),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              if (hasFile)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (_selectedBytes != null && _isImage)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.memory(
                                _selectedBytes!,
                                width: 52,
                                height: 52,
                                fit: BoxFit.cover,
                              ),
                            )
                          else
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                _isImage ? Icons.image : Icons.picture_as_pdf,
                                color: Colors.blue.shade700,
                                size: 28,
                              ),
                            ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedFileName ??
                                      _selectedFile?.path.split('/').last ??
                                      'Certificate Document',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _selectedBytes != null
                                      ? '${(_selectedBytes!.lengthInBytes / 1024).toStringAsFixed(1)} KB • Ready to upload'
                                      : 'Selected file',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            tooltip: 'Remove',
                            onPressed: _clearSelection,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _pickFile,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Change File'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 38),
                        ),
                      ),
                    ],
                  ),
                )
              else if (hasUrl && !_showUrlInput)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.link, color: Colors.green.shade700, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Current Certificate URL',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _selectedUrl!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.red),
                        onPressed: _clearSelection,
                      ),
                    ],
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(
                        Icons.cloud_upload_outlined,
                        size: 48,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Upload Certificate Document or Image',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Supported formats: PDF, JPG, PNG, WEBP (Max 10MB)',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 18),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        alignment: WrapAlignment.center,
                        children: [
                          FilledButton.icon(
                            onPressed: _pickFile,
                            icon: const Icon(Icons.folder_open, size: 18),
                            label: const Text('Browse Files'),
                          ),
                          if (!kIsWeb)
                            OutlinedButton.icon(
                              onPressed: _pickImageFromCamera,
                              icon: const Icon(Icons.camera_alt, size: 18),
                              label: const Text('Take Photo'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // ── Direct URL Option ──────────────────────────────────────────
        Row(
          children: [
            Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Text(
                'Or',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ),
            Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1)),
          ],
        ),

        const SizedBox(height: 6),

        TextButton.icon(
          onPressed: _toggleUrlInput,
          icon: Icon(_showUrlInput ? Icons.expand_less : Icons.expand_more, size: 18),
          label: Text(
            _showUrlInput
                ? 'Hide URL Option'
                : 'Provide Certificate Direct URL Instead',
            style: const TextStyle(fontSize: 13),
          ),
        ),

        if (_showUrlInput)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: TextFormField(
              initialValue: _selectedUrl,
              onChanged: _updateUrl,
              decoration: InputDecoration(
                hintText: 'https://res.cloudinary.com/... or https://...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                prefixIcon: const Icon(Icons.link),
                labelText: 'Certificate Direct URL',
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),
      ],
    );
  }
}
