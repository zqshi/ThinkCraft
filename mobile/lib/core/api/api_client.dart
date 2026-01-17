import 'package:dio/dio.dart';

import '../utils/constants.dart';
import 'api_interceptor.dart';

class ApiClient {
  ApiClient() : dio = Dio(
          BaseOptions(
            baseUrl: AppConstants.apiBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 20),
          ),
        ) {
    dio.interceptors.add(ApiInterceptor());
  }

  final Dio dio;
}
