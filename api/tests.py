from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from api.models import *
import io
from PIL import Image
import json
from unittest.mock import patch
from api.models import Model as MLModel  # To avoid clash with Django's internal Model name


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.client = APIClient()

    def test_get_current_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('current-profile')  # <- Corrected name
        response = self.client.get(url)
  
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"], self.user.id)
        self.assertEqual(response.data["name"], self.user.username)
        self.assertIn("datasetsCount", response.data)
        self.assertIn("modelsCount", response.data)

    def test_get_current_profile_unauthenticated(self):
        url = reverse('current-profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, "")


class DatasetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def create_image(self):
        img = Image.new("RGB", (100, 100))
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)
        return SimpleUploadedFile("test.jpg", buffer.read(), content_type="image/jpeg")

    def create_dataset(self, **kwargs):
        data = {
            "name": "Test Dataset",
            "description": "Test description",
            "visibility": "private",
            "image": self.create_image(),
            "datatype": "classification",
            "dataset_type": "image",
            "keywords": '["a", "b"]',
        }
        data.update(kwargs)
        return self.client.post(reverse("create-dataset"), data, format="multipart")

    def test_create_dataset(self):
        response = self.create_dataset()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Dataset.objects.filter(name="Test Dataset").exists())

    def test_get_my_datasets(self):
        self.create_dataset(name="Dataset 1")
        self.create_dataset(name="Dataset 2")
        response = self.client.get(reverse("my-datasets"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_public_datasets(self):
        self.create_dataset(name="Private DS", visibility="private")
        self.create_dataset(name="Public DS", visibility="public")
        self.client.logout()
        response = self.client.get(reverse("datasets"))
        names = [ds["name"] for ds in response.data]
        self.assertIn("Public DS", names)
        self.assertNotIn("Private DS", names)

    def test_get_dataset_private_owner(self):
        response = self.create_dataset(name="PrivateViewTest")
        ds_id = response.data["id"]
        url = reverse("get-dataset", kwargs={"id": ds_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "PrivateViewTest")

    def test_get_dataset_unauthorized(self):
        response = self.create_dataset(name="ShouldBeBlocked")
        ds_id = response.data["id"]
        self.client.logout()
        url = reverse("get-dataset", kwargs={"id": ds_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_dataset_public(self):
        response = self.create_dataset(name="PublicGet", visibility="public")
        ds_id = response.data["id"]
        self.client.logout()
        url = reverse("get-dataset-public", kwargs={"id": ds_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "PublicGet")

    def test_edit_dataset(self):
        response = self.create_dataset(name="Editable")
        ds_id = response.data["id"]
        url = reverse("edit-dataset")
        updated_data = {
            "id": ds_id,
            "name": "Updated Name",
            "description": "Updated",
            "visibility": "public",
            "image": self.create_image(),
            "keywords": "x,y,z",
            "imageWidth": 128,
            "imageHeight": 128,
        }
        response = self.client.post(url, updated_data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated = Dataset.objects.get(id=ds_id)
        self.assertEqual(updated.name, "Updated Name")

    def test_delete_dataset(self):
        response = self.create_dataset(name="ToDelete")
        ds_id = response.data["id"]
        url = reverse("delete-dataset")
        response = self.client.post(url, {"dataset": ds_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Dataset.objects.filter(id=ds_id).exists())
        
        
class ElementTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(
            name="Test DS",
            owner=self.user.profile,
            dataset_type="image",
            datatype="classification",
        )

    def create_image_file(self):
        img = Image.new("RGB", (100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return SimpleUploadedFile("img.jpg", buf.read(), content_type="image/jpeg")

    def create_element(self):
        file = self.create_image_file()
        response = self.client.post(
            reverse("create-element"),
            {"file": file, "dataset": self.dataset.id, "index": 0},
            format="multipart"
        )
        return response

    def test_create_element(self):
        response = self.create_element()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Element.objects.exists())

    def test_edit_element_label(self):
        element = Element.objects.create(name="E1", dataset=self.dataset, owner=self.user.profile)
        label = Label.objects.create(name="L1", dataset=self.dataset, owner=self.user.profile)
        response = self.client.post(reverse("edit-element-label"), data={
            "id": element.id,
            "label": label.id
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Element.objects.get(id=element.id).label.id, label.id)

    def test_remove_element_label(self):
        label = Label.objects.create(name="L1", dataset=self.dataset, owner=self.user.profile)
        element = Element.objects.create(name="E1", dataset=self.dataset, owner=self.user.profile, label=label)
        response = self.client.post(reverse("remove-element-label"), data={"id": element.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(Element.objects.get(id=element.id).label)

    def test_edit_element_metadata(self):
        element = Element.objects.create(name="Old", text="old text", dataset=self.dataset, owner=self.user.profile)
        response = self.client.post(reverse("edit-element"), data={
            "id": element.id,
            "name": "New",
            "text": "new text"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated = Element.objects.get(id=element.id)
        self.assertEqual(updated.name, "New")
        self.assertEqual(updated.text, "new text")

    def test_delete_element(self):
        element = Element.objects.create(name="Del", dataset=self.dataset, owner=self.user.profile)
        response = self.client.post(reverse("delete-element"), data={"element": element.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Element.objects.filter(id=element.id).exists())

    def test_resize_element_image(self):
        response = self.create_element()
        element_id = response.data["id"]
        resize_data = {
            "id": element_id,
            "width": 50,
            "height": 50
        }
        response = self.client.post(reverse("resize-element-image"), data=resize_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        element = Element.objects.get(id=element_id)
        self.assertEqual(element.imageWidth, 50)
        self.assertEqual(element.imageHeight, 50)
        
        
class LabelTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.dataset = Dataset.objects.create(
            name="LabelTestSet",
            owner=self.user.profile,
            dataset_type="image"
        )

    def test_create_label(self):
        data = {
            "name": "Label1",
            "color": "#ffcc00",
            "keybind": "a",
            "dataset": self.dataset.id,
            "index": 0
        }
        response = self.client.post(reverse("create-label"), data=json.dumps(data), content_type="application/json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Label.objects.filter(name="Label1").exists())

    def test_edit_label(self):
        label = Label.objects.create(name="OldLabel", dataset=self.dataset, owner=self.user.profile)
        data = {"name": "NewLabel", "color": "#000000", "keybind": "z", "label": label.id}
        response = self.client.post(reverse("edit-label"), data=json.dumps(data), content_type="application/json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Label.objects.get(id=label.id).name, "NewLabel")

    def test_delete_label(self):
        label = Label.objects.create(name="DelLabel", dataset=self.dataset, owner=self.user.profile)
        response = self.client.post(reverse("delete-label"), data={"label": label.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Label.objects.filter(id=label.id).exists())

    def test_list_labels_for_dataset(self):
        Label.objects.create(name="L1", dataset=self.dataset, owner=self.user.profile)
        Label.objects.create(name="L2", dataset=self.dataset, owner=self.user.profile)
        response = self.client.get(reverse("dataset-labels"), {"dataset": self.dataset.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
class ModelTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="modeluser", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.image = self.create_image_file()

    def create_image_file(self):
        img = Image.new("RGB", (100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return SimpleUploadedFile("img.jpg", buf.read(), content_type="image/jpeg")

    def create_model(self, **kwargs):
        data = {
            "name": "MyModel",
            "model_type": "image",
            "description": "initial",
            "visibility": "private",
            "image": self.image,
        }
        data.update(kwargs)
        return self.client.post(reverse("create-model"), data, format="multipart")

    def test_create_model(self):
        response = self.create_model()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(MLModel.objects.filter(name="MyModel").exists())

    def test_edit_model(self):
        model = MLModel.objects.create(name="Old", model_type="image", owner=self.user.profile)
        response = self.client.post(reverse("edit-model"), {
            "id": model.id,
            "name": "NewName",
            "description": "Updated",
            "visibility": "public",
            "image": self.image
        }, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(MLModel.objects.get(id=model.id).name, "NewName")

    def test_delete_model(self):
        model = MLModel.objects.create(name="ToDelete", model_type="image", owner=self.user.profile)
        response = self.client.post(reverse("delete-model"), {"model": model.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(MLModel.objects.filter(id=model.id).exists())

    def test_save_unsave_model(self):
        model = MLModel.objects.create(name="Savable", model_type="image", owner=self.user.profile)
        model.refresh_from_db()

        res = self.client.post(
            reverse("save-model"),
            data=json.dumps({"id": model.id}),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn(self.user.profile, model.saved_by.all())
        
    def test_list_public_models(self):
        MLModel.objects.create(name="PrivateM", visibility="private", model_type="image", owner=self.user.profile)
        MLModel.objects.create(name="PublicM", visibility="public", model_type="image", owner=self.user.profile)
        self.client.logout()
        res = self.client.get(reverse("models"))
        names = [m["name"] for m in res.data]
        self.assertIn("PublicM", names)
        self.assertNotIn("PrivateM", names)

    @patch("api.views.build_model_task.delay")
    def test_build_model_starts_task(self, mock_build):
        model = MLModel.objects.create(name="Buildable", model_type="image", owner=self.user.profile)
        mock_build.return_value.id = "fake-task-id"
        res = self.client.post(reverse("build-model"), {
            "id": model.id,
            "optimizer": "adam",
            "loss": "binary_crossentropy"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["task_id"], "fake-task-id")

    @patch("api.views.train_model_task.delay")
    def test_train_model_on_dataset(self, mock_train):
        dataset = Dataset.objects.create(name="TrainDS", owner=self.user.profile)
        model = MLModel.objects.create(name="Trainable", model_type="image", owner=self.user.profile)
        mock_train.return_value.id = "train-task-id"
        res = self.client.post(reverse("train-model"), {
            "model": model.id,
            "dataset": dataset.id,
            "epochs": 5,
            "validation_split": 0.2,
            "tensorflow_dataset": ""
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["task_id"], "train-task-id")

    @patch("api.views.evaluate_model_task.delay")
    def test_evaluate_model(self, mock_eval):
        model = MLModel.objects.create(name="EvalModel", model_type="image", owner=self.user.profile)
        dataset = Dataset.objects.create(name="EvalSet", owner=self.user.profile)
        mock_eval.return_value.id = "eval-task-id"
        res = self.client.post(reverse("evaluate-model"), {
            "model": model.id,
            "dataset": dataset.id
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["task_id"], "eval-task-id")