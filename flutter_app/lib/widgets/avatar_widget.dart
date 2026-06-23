import 'dart:convert' as convert;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../config/app_config.dart';

/// Отображение аватара — emoji или custom (base64)
class AvatarWidget extends StatelessWidget {
  final String avatar;
  final String? customAvatar;
  final double size;
  final double borderRadius;

  const AvatarWidget({
    super.key,
    required this.avatar,
    this.customAvatar,
    this.size = 48,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    if (avatar == 'custom' && customAvatar != null && customAvatar!.isNotEmpty) {
      // Custom avatar (base64 data URI)
      final base64Data = customAvatar!.split(',').last;
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.memory(
          _decodeBase64(base64Data),
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _emojiAvatar(),
        ),
      );
    }
    return _emojiAvatar();
  }

  Widget _emojiAvatar() {
    final def = Avatars.getAvatar(avatar);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Color(def.color).withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: Text(
          def.emoji,
          style: TextStyle(fontSize: size * 0.55),
        ),
      ),
    );
  }
}

Uint8List _decodeBase64(String base64Str) {
  return convert.base64Decode(base64Str);
}
