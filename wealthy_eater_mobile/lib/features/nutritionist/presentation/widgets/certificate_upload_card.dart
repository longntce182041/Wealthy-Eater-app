// ignore_for_file: use_build_context_synchronously

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

/// Widget for uploading certification (file or URL)
/// Supports PDF, JPG, PNG files or certificate URL
class CertificateUploadCard extends StatefulWidget {
  final Function(File?)? onFileSelected;
  final Function(String?)? onUrlSelected;
  final File? selectedFile;
  final String? selectedUrl;

  const CertificateUploadCard({
    super.key,
    this.onFileSelected,
    this.onUrlSelected,
    this.selectedFile,
    this.selectedUrl,
  });

  @override
  State<CertificateUploadCard> createState() => _CertificateUploadCardState();
}

class _CertificateUploadCardState extends State<CertificateUploadCard> {
  File? _selectedFile;
  String? _selectedUrl;
  bool _showUrlInput = false;

  @override
  void initState() {
    super.initState();
    _selectedFile = widget.selectedFile;
    _selectedUrl = widget.selectedUrl;
    _showUrlInput = kIsWeb || widget.selectedUrl != null;
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null && result.files.isNotEmpty) {
        final file = File(result.files.first.path!);
        setState(() {
          _selectedFile = file;
          _selectedUrl = null;
          _showUrlInput = false;
        });
        widget.onFileSelected?.call(file);
      }
    } catch (e) {
      ScaffoldMessenger.of(
        // ignore: duplicate_ignore
        // ignore: use_build_context_synchronously
        context,
      ).showSnackBar(SnackBar(content: Text('Error picking file: $e')));
    }
  }

  Future<void> _pickImageFromCamera() async {
    try {
      final image = await ImagePicker().pickImage(source: ImageSource.camera);
      if (image != null) {
        final file = File(image.path);
        setState(() {
          _selectedFile = file;
          _selectedUrl = null;
          _showUrlInput = false;
        });
        widget.onFileSelected?.call(file);
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error capturing image: $e')));
    }
  }

  void _updateUrl(String url) {
    if (url.isNotEmpty) {
      setState(() {
        _selectedUrl = url;
        _selectedFile = null;
      });
      widget.onUrlSelected?.call(url);
    }
  }

  void _toggleUrlInput() {
    setState(() {
      _showUrlInput = !_showUrlInput;
      if (!_showUrlInput) {
        _selectedUrl = null;
        _selectedFile = null;
        widget.onUrlSelected?.call(null);
        widget.onFileSelected?.call(null);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Upload Certification *',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),

        // File Upload Section
        if (kIsWeb)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              border: Border.all(color: Colors.amber.shade300),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'File upload is not supported on Web. Please use the URL option below.',
                    style: TextStyle(fontSize: 14, color: Colors.black87),
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
            children: [
              if (_selectedFile != null)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _selectedFile!.path.endsWith('.pdf')
                                ? Icons.picture_as_pdf
                                : Icons.image,
                            color: Colors.blue,
                            size: 32,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedFile!.path.split('/').last,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${(_selectedFile!.lengthSync() / 1024).toStringAsFixed(2)} KB',
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
                            onPressed: () {
                              setState(() => _selectedFile = null);
                              widget.onFileSelected?.call(null);
                            },
                          ),
                        ],
                      ),
                      const Divider(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _pickFile,
                          icon: const Icon(Icons.upload_file),
                          label: const Text('Choose Different File'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey.shade200,
                            foregroundColor: Colors.black87,
                          ),
                        ),
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
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Supported: PDF, JPG, PNG',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                      const SizedBox(height: 20),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton.icon(
                            onPressed: _pickFile,
                            icon: const Icon(Icons.upload_file),
                            label: const Text('Choose File'),
                          ),
                          ElevatedButton.icon(
                            onPressed: _pickImageFromCamera,
                            icon: const Icon(Icons.camera_alt),
                            label: const Text('Take Photo'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey.shade200,
                              foregroundColor: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // URL Input Option
        Row(
          children: [
            Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                'Or',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ),
            Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1)),
          ],
        ),

        const SizedBox(height: 16),

        // URL Input
        TextButton.icon(
          onPressed: _toggleUrlInput,
          icon: Icon(_showUrlInput ? Icons.expand_less : Icons.expand_more),
          label: Text(
            _showUrlInput
                ? 'Hide URL Option'
                : 'Provide Certificate URL Instead',
          ),
        ),

        if (_showUrlInput)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: TextField(
              onChanged: _updateUrl,
              decoration: InputDecoration(
                hintText: 'https://example.com/certificate.pdf',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                prefixIcon: const Icon(Icons.link),
                labelText: 'Certificate URL',
              ),
            ),
          ),

        // Status indicator
        if (_selectedFile != null || _selectedUrl != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                border: Border.all(color: Colors.green.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _selectedFile != null
                          ? 'File selected: ${_selectedFile!.path.split('/').last}'
                          : 'URL provided: $_selectedUrl',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.green.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
