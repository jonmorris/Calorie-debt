export const CALORIES_PER_POUND = 3500;

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

// Mifflin-St Jeor equation for Basal Metabolic Rate
export function calculateBMR(weightLbs, heightInches, age, sex) {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

// Total Daily Energy Expenditure
export function calculateTDEE(weightLbs, heightInches, age, sex, activityLevel) {
  const bmr = calculateBMR(weightLbs, heightInches, age, sex);
  return bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2);
}

// Total calorie debt (always positive)
export function calculateTotalDebt(currentWeight, targetWeight) {
  return Math.abs(currentWeight - targetWeight) * CALORIES_PER_POUND;
}

// Days between today and target date
export function daysUntilTarget(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const diffMs = target - now;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// Net calories burned from steps above baseline activity
// ~0.04 cal/step at 155 lbs, scales linearly with weight
export function caloriesFromSteps(steps, weightLbs) {
  return steps * weightLbs * 0.0002;
}

export function isLosingWeight(currentWeight, targetWeight) {
  return currentWeight > targetWeight;
}

// Format number as currency-style
export function formatDebt(amount) {
  return '$' + Math.round(amount).toLocaleString();
}

// Calculate all dashboard metrics from settings
export function calculateAll(settings) {
  const {
    currentWeight,
    targetWeight,
    heightFeet,
    heightInches,
    age,
    sex,
    activityLevel,
    targetDate,
    dailyStepGoal,
  } = settings;

  const totalHeightInches = heightFeet * 12 + heightInches;
  const isLosing = isLosingWeight(currentWeight, targetWeight);
  const totalDebt = calculateTotalDebt(currentWeight, targetWeight);
  const days = daysUntilTarget(targetDate);
  const dailyRequired = totalDebt / days;
  const tdee = calculateTDEE(currentWeight, totalHeightInches, age, sex, activityLevel);
  const bmr = calculateBMR(currentWeight, totalHeightInches, age, sex);
  const exerciseCalories = caloriesFromSteps(dailyStepGoal, currentWeight);
  const dietPortion = Math.max(0, dailyRequired - exerciseCalories);
  const targetIntake = isLosing ? tdee - dietPortion : tdee + dietPortion;
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const weeksToTarget = days / 7;
  const lbsPerWeek = weightDiff / weeksToTarget;

  return {
    isLosing,
    totalDebt,
    days,
    dailyRequired,
    tdee,
    bmr,
    exerciseCalories,
    dietDeficit: dietPortion,
    targetIntake,
    weightDiff,
    lbsPerWeek,
    currentWeight,
    targetWeight,
    dailyStepGoal,
    sex,
  };
}
