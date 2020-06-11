import { Category, CategoryLogger, CategoryServiceFactory, CategoryConfiguration, LogLevel } from 'typescript-logging';
import { CategoryServiceControlImpl } from 'typescript-logging/dist/commonjs/control/CategoryServiceControl';

// Optionally change default settings, in this example set default logging to Info.
// Without changing configuration, categories will log to Error.
const catConfig: CategoryConfiguration = new CategoryConfiguration(LogLevel.Debug);
CategoryServiceFactory.setDefaultConfiguration(catConfig);

// Create categories, they will autoregister themselves, one category without parent (root) and a child category.
export const logApp: Category     = new Category('app');
export const logUser: Category    = new Category('user',    logApp);
export const logSession: Category = new Category('session', logApp);
export const logCourse: Category  = new Category('course',  logApp);
export const logTeacher: Category = new Category('teacher', logApp);
export const logService: Category = new Category('service', logApp);

// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logApp);
// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logUser);
// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logSession);
// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logCourse);
// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logTeacher);
// CategoryServiceFactory.setConfigurationCategory(new CategoryConfiguration(LogLevel.Debug), logService);
