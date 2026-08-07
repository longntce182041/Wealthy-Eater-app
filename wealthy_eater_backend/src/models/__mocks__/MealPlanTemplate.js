// Auto-mock for MealPlanTemplate model
const mockMealPlanTemplate = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'tmpl_mock_001',
  save: jest.fn().mockResolvedValue(true),
}));

mockMealPlanTemplate.find = jest.fn().mockReturnValue({
  lean: jest.fn().mockResolvedValue([])
});
mockMealPlanTemplate.findById = jest.fn().mockReturnValue({
  lean: jest.fn().mockResolvedValue(null)
});
mockMealPlanTemplate.create = jest.fn().mockResolvedValue({ _id: 'tmpl_001' });

module.exports = mockMealPlanTemplate;
