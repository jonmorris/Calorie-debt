export const CALORIES_PER_POUND = 3500;

const ACTIVITY_MULTIPLIERS = {
  desk: 1.2,
  onFeet: 1.375,
  physical: 1.55,
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

// Total calorie deficit needed (always positive)
export function calculateTotalDeficit(currentWeight, targetWeight) {
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
export function caloriesFromSteps(steps, weightLbs) {
  return steps * weightLbs * 0.0002;
}

export function isLosingWeight(currentWeight, targetWeight) {
  return currentWeight > targetWeight;
}

// Format number as calorie amount
export function formatCal(amount) {
  return Math.round(amount).toLocaleString() + ' cal';
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
    planMode,
    lbsPerWeek: settingLbsPerWeek,
    targetDate: settingTargetDate,
    calorieBudget: settingCalorieBudget,
    dailyStepGoal,
  } = settings;

  const totalHeightInches = heightFeet * 12 + heightInches;
  const isLosing = isLosingWeight(currentWeight, targetWeight);
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const totalDeficit = calculateTotalDeficit(currentWeight, targetWeight);
  const tdee = calculateTDEE(currentWeight, totalHeightInches, age, sex, activityLevel);
  const exerciseCalories = caloriesFromSteps(dailyStepGoal, currentWeight);

  // Determine effective values based on plan mode
  let days, lbsPerWeek, targetDate, dailyRequired, dietPortion, targetIntake;

  if (planMode === 'lbsPerWeek') {
    lbsPerWeek = Math.max(0.1, settingLbsPerWeek || 1.5);
    days = weightDiff > 0 ? Math.max(1, Math.ceil((weightDiff / lbsPerWeek) * 7)) : 1;
    const d = new Date();
    d.setDate(d.getDate() + days);
    targetDate = d.toISOString().split('T')[0];
    dailyRequired = totalDeficit / days;
    dietPortion = Math.max(0, dailyRequired - exerciseCalories);
    targetIntake = isLosing ? tdee - dietPortion : tdee + dietPortion;
  } else if (planMode === 'calorieBudget') {
    const budget = Math.max(0, settingCalorieBudget || 1800);
    targetIntake = budget;
    dietPortion = Math.max(0, tdee - budget);
    dailyRequired = dietPortion + exerciseCalories;
    lbsPerWeek = dailyRequired > 0 ? (dailyRequired * 7) / CALORIES_PER_POUND : 0;
    days = weightDiff > 0 && lbsPerWeek > 0
      ? Math.max(1, Math.ceil((weightDiff / lbsPerWeek) * 7))
      : 1;
    const d = new Date();
    d.setDate(d.getDate() + days);
    targetDate = d.toISOString().split('T')[0];
  } else {
    // targetDate mode
    targetDate = settingTargetDate;
    days = daysUntilTarget(settingTargetDate);
    lbsPerWeek = weightDiff / (days / 7);
    dailyRequired = totalDeficit / days;
    dietPortion = Math.max(0, dailyRequired - exerciseCalories);
    targetIntake = isLosing ? tdee - dietPortion : tdee + dietPortion;
  }

  return {
    isLosing,
    totalDeficit,
    days,
    dailyRequired,
    tdee,
    bmr: calculateBMR(currentWeight, totalHeightInches, age, sex),
    exerciseCalories,
    dietDeficit: dietPortion,
    targetIntake,
    weightDiff,
    lbsPerWeek,
    currentWeight,
    targetWeight,
    dailyStepGoal,
    sex,
    targetDate,
  };
}
